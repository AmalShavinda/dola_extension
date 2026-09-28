/**
 * inpage-interceptor.js — Main-World Hooking Engine
 * Operates strictly on allowlisted origins (localhost / 127.0.0.1).
 * Supports: Disabled, Observe, and Modify modes.
 */
(() => {
  if (window.__HELLO_DOLA_INTERCEPTOR_ACTIVE__) return;
  window.__HELLO_DOLA_INTERCEPTOR_ACTIVE__ = true;

  // Interceptor State
  const config = {
    mode: "observe", // "disabled" | "observe" | "modify"
    activeScenario: "none", // "none" | "zero_credits" | "expired_credits" | "server_rejection" | "malformed_json" | "unlimited_credits"
    allowlist: ["localhost", "https://www.dola.com"],
  };

  // Verify allowlist strictly
  function isOriginAllowed() {
    const host = window.location.hostname;
    return config.allowlist.some((allowed) => host === allowed || host.endsWith("." + allowed));
  }

  if (!isOriginAllowed()) {
    console.warn("[Harness] Execution aborted: Origin is not in the allowlist.");
    return;
  }

  function emitTrafficLog(data) {
    window.postMessage({
      source: "HELLO_DOLA_HARNESS",
      type: "TRAFFIC_LOG",
      payload: data,
    }, "*");
  }

  // Backup originals
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // Listen for config changes from extension
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "HELLO_DOLA_CONTENT_RELAY") return;
    if (event.data.type === "UPDATE_CONFIG") {
      Object.assign(config, event.data.payload);
      console.info(`[Harness] Config updated: Mode = ${config.mode}, Scenario = ${config.activeScenario}`);
    }
  });

  /* ── 1. Fetch Interception ───────────────────────────── */
  window.fetch = async function (...args) {
    if (config.mode === "disabled") {
      return originalFetch.apply(this, args);
    }

    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    let url = args[0] instanceof Request ? args[0].url : String(args[0]);
    let options = args[1] || {};
    let method = (options.method || (args[0] instanceof Request ? args[0].method : "GET")).toUpperCase();

    let requestBody = null;
    try {
      if (options.body) {
        requestBody = typeof options.body === "string" ? options.body : "[Binary/FormData]";
      }
    } catch (_) { }

    // In Modify mode: check simulated scenarios on credit/generation endpoints
    if (config.mode === "modify" && config.activeScenario !== "none") {
      const mockResult = getMockResponse(url, config.activeScenario);
      if (mockResult) {
        const duration = Math.round(performance.now() - startTime);
        emitTrafficLog({
          url,
          method,
          requestHeaders: options.headers || {},
          requestPayload: requestBody,
          responseStatus: mockResult.status,
          responsePayload: mockResult.bodyText,
          timestamp,
          duration,
          simulated: true,
          scenario: config.activeScenario,
        });

        return new Response(mockResult.bodyText, {
          status: mockResult.status,
          statusText: mockResult.statusText,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Pass-through in Observe mode
    try {
      const response = await originalFetch.apply(this, args);
      const clone = response.clone();
      const duration = Math.round(performance.now() - startTime);

      let responseText = "";
      try {
        responseText = await clone.text();
      } catch (err) {
        responseText = `[Could not read text: ${err.message}]`;
      }

      emitTrafficLog({
        url,
        method,
        requestHeaders: options.headers || {},
        requestPayload: requestBody,
        responseStatus: response.status,
        responsePayload: responseText,
        timestamp,
        duration,
        simulated: false,
      });

      return response;
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      emitTrafficLog({
        url,
        method,
        requestHeaders: options.headers || {},
        requestPayload: requestBody,
        responseStatus: 0,
        responsePayload: `Network Error: ${err.message}`,
        timestamp,
        duration,
        simulated: false,
      });
      throw err;
    }
  };

  /* ── 2. XMLHttpRequest Interception ──────────────────── */
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__harness_meta = {
      method,
      url: String(url),
      headers: {},
      startTime: 0,
      timestamp: "",
    };
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (this.__harness_meta) {
      this.__harness_meta.headers[header] = value;
    }
    return originalXHRSetRequestHeader.call(this, header, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__harness_meta || config.mode === "disabled") {
      return originalXHRSend.call(this, body);
    }

    const meta = this.__harness_meta;
    meta.startTime = performance.now();
    meta.timestamp = new Date().toISOString();
    meta.requestPayload = typeof body === "string" ? body : body ? "[Payload]" : null;

    // Modify mode for XHR
    if (config.mode === "modify" && config.activeScenario !== "none") {
      const mockResult = getMockResponse(meta.url, config.activeScenario);
      if (mockResult) {
        setTimeout(() => {
          Object.defineProperty(this, "status", { value: mockResult.status, writable: false });
          Object.defineProperty(this, "responseText", { value: mockResult.bodyText, writable: false });
          Object.defineProperty(this, "response", { value: mockResult.bodyText, writable: false });
          Object.defineProperty(this, "readyState", { value: 4, writable: false });

          const duration = Math.round(performance.now() - meta.startTime);
          emitTrafficLog({
            url: meta.url,
            method: meta.method,
            requestHeaders: meta.headers,
            requestPayload: meta.requestPayload,
            responseStatus: mockResult.status,
            responsePayload: mockResult.bodyText,
            timestamp: meta.timestamp,
            duration,
            simulated: true,
            scenario: config.activeScenario,
          });

          this.dispatchEvent(new Event("readystatechange"));
          this.dispatchEvent(new Event("load"));
        }, 10);
        return;
      }
    }

    this.addEventListener("loadend", () => {
      const duration = Math.round(performance.now() - meta.startTime);
      emitTrafficLog({
        url: meta.url,
        method: meta.method,
        requestHeaders: meta.headers,
        requestPayload: meta.requestPayload,
        responseStatus: this.status,
        responsePayload: this.responseText || "[No content]",
        timestamp: meta.timestamp,
        duration,
        simulated: false,
      });
    });

    return originalXHRSend.call(this, body);
  };

  /* ── 3. Mock Scenario Test Generator ─────────────────── */
  function getMockResponse(url, scenario) {
    // Only intercept paths that resemble credit checks or generation requests
    const isTarget = /\b(credit|balance|user|limits|generate|render)\b/i.test(url);
    if (!isTarget && scenario !== "server_rejection") return null;

    switch (scenario) {
      case "zero_credits":
        return {
          status: 200,
          statusText: "OK",
          bodyText: JSON.stringify({
            credits: 0,
            remaining: 0,
            daily_limit: 50,
            status: "exhausted",
            message: "[SIMULATION] Zero credits remaining.",
          }),
        };

      case "expired_credits":
        return {
          status: 403,
          statusText: "Forbidden",
          bodyText: JSON.stringify({
            error: "CREDITS_EXPIRED",
            message: "[SIMULATION] Plan expired on 2026-09-01.",
            credits: 0,
          }),
        };

      case "server_rejection":
        return {
          status: 402,
          statusText: "Payment Required",
          bodyText: JSON.stringify({
            error: "QUOTA_EXCEEDED",
            status_code: 402,
            message: "[SIMULATION] Server rejected request: Insufficient account quota.",
          }),
        };

      case "malformed_json":
        return {
          status: 200,
          statusText: "OK",
          bodyText: "{ credit_balance: NaN, status: undefined <<<MALFORMED_PAYLOAD>>>",
        };

      case "unlimited_credits":
        return {
          status: 200,
          statusText: "OK",
          bodyText: JSON.stringify({
            credits: 999999,
            remaining: 999999,
            unlimited: true,
            tier: "SECURITY_TEST_HARNESS",
          }),
        };

      default:
        return null;
    }
  }

  console.info("[Harness] In-page interceptor hooked successfully on allowlisted origin.");
})();
