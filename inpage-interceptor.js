/**
 * inpage-interceptor.js — Dola AI Pro 30s & Strict 1080p Engine (ShamodPro v3)
 * Injected into the main execution realm of Dola AI / Doubao / Localhost.
 * Intercepts window.fetch and XMLHttpRequest to:
 * 1. Force 30-Second duration in outgoing video requests.
 * 2. Strictly enforce 1080p / Full HD resolution & definition.
 * 3. Upgrade model identifier to Seedance 2.5 (enables 30s & 1080p capacity).
 * 4. Auto-detect & auto-retry "High Demand" / 429 / 503 server rejections.
 * 5. Strip watermarks from request parameters.
 * 6. Intercept incoming video stream URLs for clean MP4 extraction.
 */
(() => {
  if (window.__DOLA_AI_PRO_INTERCEPTOR_ACTIVE__) return;
  window.__DOLA_AI_PRO_INTERCEPTOR_ACTIVE__ = true;

  // Interceptor Configuration
  const config = {
    mode: "active",            // "active" | "observe" | "modify" | "disabled"
    enable30s: true,           // Enforce 30s duration override
    strict1080p: true,         // Strictly enforce 1080p / HD resolution
    fixHighDemand: true,       // Auto-retry on High Demand / busy errors
    removeWatermark: true,     // Strip watermarks
    enableSeedance: true,      // Target Seedance 2.5 model
    maxRetries: 5,             // Max retries for High Demand errors
    retryDelayMs: 1500,        // Base retry delay (ms)
    activeScenario: "none",    // "none" | "zero_credits" | "expired_credits" | "server_rejection" | "malformed_json" | "unlimited_credits"
    allowlist: [
      "localhost",
      "127.0.0.1",
      "dola.com",
      "trydola.com",
      "dola.ai",
      "doubao.com"
    ]
  };

  function emitMessage(type, payload) {
    window.postMessage({
      source: "DOLA_AI_PRO_HARNESS",
      type,
      payload
    }, "*");
  }

  // Backup native network primitives
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // Listen for config sync from content script
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "DOLA_AI_PRO_RELAY") return;
    if (event.data.type === "UPDATE_CONFIG") {
      Object.assign(config, event.data.payload);
      console.info("⚡ [Dola Pro Engine] Configuration synchronized:", config);
    }
  });

  /* ── 1. Comprehensive Payload Mutator (30s, 1080p, Seedance 2.5) ── */
  function patchObjectFor30sAnd1080p(obj) {
    if (!obj || typeof obj !== "object") return false;
    let modified = false;

    for (const key of Object.keys(obj)) {
      const val = obj[key];

      // 1. Duration Patching -> Force 30s
      if (/^(duration|video_duration|duration_seconds|seconds|length|video_length|time_limit|clip_duration|total_duration)$/i.test(key)) {
        if (config.enable30s) {
          if (typeof val === "string" && val.toLowerCase().endsWith("s")) {
            obj[key] = "30s";
          } else if (typeof val === "string") {
            obj[key] = "30";
          } else {
            obj[key] = 30;
          }
          modified = true;
        }
      }

      // 2. Strict 1080p Resolution & Definition
      else if (/^(resolution|video_resolution|definition|video_definition|quality|clarity|scale|pixel_format|render_quality)$/i.test(key)) {
        if (config.strict1080p) {
          if (/^(definition|quality)$/i.test(key) && typeof val === "string" && (val.toLowerCase() === "hd" || val.toLowerCase() === "standard")) {
            obj[key] = "hd";
          } else {
            obj[key] = "1080p";
          }
          modified = true;
        }
      }

      // 3. Explicit Width / Height Dimensions (1920x1080 for 16:9, 1080x1920 for 9:16)
      else if (key === "width" || key === "video_width") {
        if (config.strict1080p && typeof val === "number" && val <= 1280) {
          if (obj.height === 720 || obj.video_height === 720) {
            obj[key] = 1920;
            obj.height = 1080;
            if (obj.video_height) obj.video_height = 1080;
            modified = true;
          } else if (obj.height === 1280 || obj.video_height === 1280) {
            obj[key] = 1080;
            obj.height = 1920;
            if (obj.video_height) obj.video_height = 1920;
            modified = true;
          }
        }
      }

      // 4. Size / Dimension Strings (e.g. "1280*720" -> "1920*1080")
      else if (/^(size|video_size|dimension|dimensions)$/i.test(key)) {
        if (config.strict1080p && typeof val === "string") {
          if (val.includes("1280") || val.includes("720") || val.includes("480")) {
            if (val.includes("1280*720") || val.includes("1280x720")) {
              obj[key] = val.replace(/1280[*xX]720/g, "1920*1080");
              modified = true;
            } else if (val.includes("720*1280") || val.includes("720x1280")) {
              obj[key] = val.replace(/720[*xX]1280/g, "1080*1920");
              modified = true;
            } else {
              obj[key] = "1920*1080";
              modified = true;
            }
          }
        }
      }

      // 5. Model: Upgrade Seedance 2.0 / generic to Seedance 2.5 (enables 30s & 1080p)
      else if (/^(model|model_name|model_id|model_type|engine)$/i.test(key)) {
        if (config.enableSeedance && typeof val === "string") {
          if (/seedance/i.test(val)) {
            const upgraded = val.replace(/2[._-]0|1[._-]5|fast|mini/gi, "2.5")
                                .replace(/seedance$/i, "seedance-2.5");
            if (upgraded !== val) {
              obj[key] = upgraded;
              modified = true;
            } else if (!val.includes("2.5") && !val.includes("2-5")) {
              obj[key] = "doubao-seedance-2-5";
              modified = true;
            }
          }
        }
      }

      // 6. Watermark Removal
      else if (/^(watermark|has_watermark|show_watermark)$/i.test(key)) {
        if (config.removeWatermark) {
          obj[key] = false;
          modified = true;
        }
      } else if (/^(no_watermark|remove_watermark|without_watermark)$/i.test(key)) {
        if (config.removeWatermark) {
          obj[key] = true;
          modified = true;
        }
      }

      // 7. Recursive traversal of objects
      else if (typeof val === "object" && val !== null) {
        if (patchObjectFor30sAnd1080p(val)) modified = true;
      }

      // 8. Embedded JSON strings
      else if (typeof val === "string" && (val.trim().startsWith("{") || val.trim().startsWith("["))) {
        try {
          const parsed = JSON.parse(val);
          if (patchObjectFor30sAnd1080p(parsed)) {
            obj[key] = JSON.stringify(parsed);
            modified = true;
          }
        } catch (_) { }
      }
    }

    // Contextual Injection: If this is a video generation request missing explicit duration/resolution
    const isVideoContext = Boolean(
      obj.prompt || obj.text_prompt || obj.input_text ||
      obj.video || obj.video_config || obj.model_type === "video" ||
      obj.task_type === "video" || obj.action === "generate_video"
    );

    if (isVideoContext) {
      if (config.enable30s && obj.duration === undefined && obj.video_duration === undefined) {
        obj.duration = 30;
        modified = true;
      }
      if (config.strict1080p && obj.resolution === undefined && obj.video_resolution === undefined) {
        obj.resolution = "1080p";
        modified = true;
      }
      if (config.enableSeedance && (!obj.model || obj.model === "seedance")) {
        obj.model = "doubao-seedance-2-5";
        modified = true;
      }
    }

    return modified;
  }

  function patchUrlParams(urlStr) {
    try {
      const parsed = new URL(urlStr, window.location.origin);
      let changed = false;
      for (const [param] of parsed.searchParams) {
        if (/^(duration|video_duration|seconds|length)$/i.test(param) && config.enable30s) {
          parsed.searchParams.set(param, "30");
          changed = true;
        } else if (/^(resolution|definition|quality)$/i.test(param) && config.strict1080p) {
          parsed.searchParams.set(param, "1080p");
          changed = true;
        } else if (/^(model|model_name)$/i.test(param) && config.enableSeedance) {
          parsed.searchParams.set(param, "doubao-seedance-2-5");
          changed = true;
        }
      }
      return changed ? parsed.toString() : urlStr;
    } catch (_) {
      return urlStr;
    }
  }

  function patchFormData(formData) {
    if (!(formData instanceof FormData)) return false;
    let modified = false;

    for (const [key, val] of formData.entries()) {
      if (typeof val === "string" && (val.trim().startsWith("{") || val.trim().startsWith("["))) {
        try {
          const parsed = JSON.parse(val);
          if (patchObjectFor30sAnd1080p(parsed)) {
            formData.set(key, JSON.stringify(parsed));
            modified = true;
          }
        } catch (_) {}
      } else if (/^(duration|video_duration|seconds|length)$/i.test(key) && config.enable30s) {
        formData.set(key, "30");
        modified = true;
      } else if (/^(resolution|definition|quality)$/i.test(key) && config.strict1080p) {
        formData.set(key, "1080p");
        modified = true;
      } else if (/^(model|model_name)$/i.test(key) && config.enableSeedance) {
        formData.set(key, "doubao-seedance-2-5");
        modified = true;
      }
    }

    if (config.enable30s && !formData.has("duration")) {
      formData.set("duration", "30");
      modified = true;
    }
    if (config.strict1080p && !formData.has("resolution")) {
      formData.set("resolution", "1080p");
      modified = true;
    }
    return modified;
  }

  function inspectAndExtractVideos(url, responseText) {
    if (!responseText || typeof responseText !== "string") return;
    const matches = responseText.match(/https?:\/\/[^\s"'<>\\]+?\.(?:mp4|webm)[^\s"'<>\\]*/gi) ||
                    responseText.match(/https?:\/\/[^\s"'<>\\]+?(?:volces\.com|byteimg\.com|dola\.com|tos-)[^\s"'<>\\]+video[^\s"'<>\\]*/gi);

    if (matches && matches.length > 0) {
      const cleanUrls = Array.from(new Set(matches)).map((u) => {
        let clean = u.replace(/\\u0026/g, "&").replace(/\\/g, "");
        clean = clean.replace(/([?&])(watermark|wm)=[0-9a-zA-Z]+/g, "");
        return clean;
      });

      emitMessage("VIDEO_CAPTURED", {
        sourceUrl: url,
        videoUrls: cleanUrls,
        timestamp: new Date().toISOString()
      });
    }
  }

  function isHighDemandError(status, bodyText) {
    if (status === 429 || status === 503 || status === 504) return true;
    if (!bodyText || typeof bodyText !== "string") return false;
    const lower = bodyText.toLowerCase();
    return (
      lower.includes("high demand") ||
      lower.includes("server busy") ||
      lower.includes("system busy") ||
      lower.includes("capacity reached") ||
      lower.includes("too many requests") ||
      lower.includes("please try again later") ||
      lower.includes("rate limit") ||
      lower.includes("server_busy") ||
      lower.includes("quota_exhausted")
    );
  }

  /* ── 2. Intercept window.fetch ───────────────────────── */
  window.fetch = async function (...args) {
    if (config.mode === "disabled") {
      return originalFetch.apply(this, args);
    }

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    let url = "";
    let options = {};
    let method = "GET";
    let requestBody = null;
    let isRequestInstance = false;

    // Handle when args[0] is a Request object
    if (args[0] instanceof Request) {
      isRequestInstance = true;
      const req = args[0];
      url = req.url;
      method = req.method.toUpperCase();
      options = {
        method,
        headers: new Headers(req.headers),
        credentials: req.credentials,
        mode: req.mode,
        cache: req.cache,
        redirect: req.redirect,
        referrer: req.referrer,
      };

      if (method !== "GET" && method !== "HEAD") {
        try {
          requestBody = await req.clone().text();
        } catch (_) {}
      }
    } else {
      url = String(args[0]);
      options = args[1] || {};
      method = (options.method || "GET").toUpperCase();
      requestBody = options.body;
    }

    // Apply URL query modifications
    const patchedUrl = patchUrlParams(url);
    let wasModifiedFor30s = false;
    let wasModifiedFor1080p = false;

    // Patch Body
    if (requestBody && typeof requestBody === "string") {
      try {
        const parsed = JSON.parse(requestBody);
        if (patchObjectFor30sAnd1080p(parsed)) {
          requestBody = JSON.stringify(parsed);
          options.body = requestBody;
          wasModifiedFor30s = config.enable30s;
          wasModifiedFor1080p = config.strict1080p;
          console.info("⚡ [Dola Pro] Intercepted & Patched fetch payload -> 30s | 1080p | Seedance 2.5:", patchedUrl);
        }
      } catch (_) { }
    } else if (requestBody instanceof FormData) {
      if (patchFormData(requestBody)) {
        wasModifiedFor30s = config.enable30s;
        wasModifiedFor1080p = config.strict1080p;
        options.body = requestBody;
        console.info("⚡ [Dola Pro] Intercepted & Patched FormData payload -> 30s | 1080p:", patchedUrl);
      }
    } else if (requestBody instanceof URLSearchParams) {
      if (config.enable30s) { requestBody.set("duration", "30"); wasModifiedFor30s = true; }
      if (config.strict1080p) { requestBody.set("resolution", "1080p"); wasModifiedFor1080p = true; }
      if (config.enableSeedance) requestBody.set("model", "doubao-seedance-2-5");
      options.body = requestBody;
    }

    // Reconstruct arguments
    if (isRequestInstance) {
      args[0] = new Request(patchedUrl, options);
    } else {
      args[0] = patchedUrl;
      args[1] = options;
    }

    // Check simulated mock scenarios (for local test targets)
    if (config.mode === "modify" && config.activeScenario !== "none") {
      const mockResult = getMockResponse(patchedUrl, config.activeScenario);
      if (mockResult) {
        const duration = Math.round(performance.now() - startTime);
        emitMessage("TRAFFIC_LOG", {
          url: patchedUrl,
          method,
          requestHeaders: options.headers || {},
          requestPayload: requestBody,
          responseStatus: mockResult.status,
          responsePayload: mockResult.bodyText,
          timestamp,
          duration,
          simulated: true,
          wasModifiedFor30s,
          wasModifiedFor1080p,
          scenario: config.activeScenario,
        });

        return new Response(mockResult.bodyText, {
          status: mockResult.status,
          statusText: mockResult.statusText,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Dispatch request with automatic High Demand retry loop
    let currentAttempt = 0;
    const maxAttempts = config.fixHighDemand ? config.maxRetries : 1;

    while (currentAttempt < maxAttempts) {
      currentAttempt++;
      try {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        const duration = Math.round(performance.now() - startTime);

        let responseText = "";
        try {
          responseText = await clone.text();
        } catch (err) {
          responseText = `[Body unreadable: ${err.message}]`;
        }

        // Check for High Demand error
        if (config.fixHighDemand && isHighDemandError(response.status, responseText)) {
          if (currentAttempt < maxAttempts) {
            const jitter = Math.floor(Math.random() * 500);
            const delay = (config.retryDelayMs * currentAttempt) + jitter;
            console.warn(`[Dola Pro Fix] High Demand encountered (Status: ${response.status}). Auto-retrying attempt ${currentAttempt}/${maxAttempts} in ${delay}ms...`);
            emitMessage("HIGH_DEMAND_RETRY", {
              url: patchedUrl,
              attempt: currentAttempt,
              maxRetries: maxAttempts,
              delayMs: delay,
            });
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }

        // Scan response for clean video URLs
        inspectAndExtractVideos(patchedUrl, responseText);

        // Emit traffic log
        emitMessage("TRAFFIC_LOG", {
          url: patchedUrl,
          method,
          requestHeaders: options.headers || {},
          requestPayload: requestBody,
          responseStatus: response.status,
          responsePayload: responseText,
          timestamp,
          duration,
          simulated: false,
          wasModifiedFor30s,
          wasModifiedFor1080p,
        });

        return response;
      } catch (err) {
        if (currentAttempt < maxAttempts && config.fixHighDemand) {
          const delay = config.retryDelayMs * currentAttempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        const duration = Math.round(performance.now() - startTime);
        emitMessage("TRAFFIC_LOG", {
          url: patchedUrl,
          method,
          requestHeaders: options.headers || {},
          requestPayload: requestBody,
          responseStatus: 0,
          responsePayload: `Network Error: ${err.message}`,
          timestamp,
          duration,
          simulated: false,
          wasModifiedFor30s,
          wasModifiedFor1080p,
        });
        throw err;
      }
    }
  };

  /* ── 3. Intercept XMLHttpRequest ─────────────────────── */
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const patchedUrl = patchUrlParams(String(url));
    this.__dola_meta = {
      method: String(method).toUpperCase(),
      url: patchedUrl,
      headers: {},
      startTime: 0,
      timestamp: "",
      wasModifiedFor30s: false,
      wasModifiedFor1080p: false,
    };
    return originalXHROpen.call(this, method, patchedUrl, ...rest);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (this.__dola_meta) {
      this.__dola_meta.headers[header] = value;
    }
    return originalXHRSetRequestHeader.call(this, header, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (!this.__dola_meta || config.mode === "disabled") {
      return originalXHRSend.call(this, body);
    }

    const meta = this.__dola_meta;
    meta.startTime = performance.now();
    meta.timestamp = new Date().toISOString();

    let outgoingBody = body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (patchObjectFor30sAnd1080p(parsed)) {
          outgoingBody = JSON.stringify(parsed);
          meta.wasModifiedFor30s = config.enable30s;
          meta.wasModifiedFor1080p = config.strict1080p;
          console.info("⚡ [Dola Pro XHR] Intercepted & Patched payload -> 30s | 1080p:", meta.url);
        }
      } catch (_) { }
    } else if (body instanceof FormData) {
      if (patchFormData(body)) {
        meta.wasModifiedFor30s = config.enable30s;
        meta.wasModifiedFor1080p = config.strict1080p;
      }
    } else if (body instanceof URLSearchParams) {
      if (config.enable30s) { body.set("duration", "30"); meta.wasModifiedFor30s = true; }
      if (config.strict1080p) { body.set("resolution", "1080p"); meta.wasModifiedFor1080p = true; }
      if (config.enableSeedance) body.set("model", "doubao-seedance-2-5");
    }
    meta.requestPayload = outgoingBody;

    // Modify mode for XHR mock scenarios
    if (config.mode === "modify" && config.activeScenario !== "none") {
      const mockResult = getMockResponse(meta.url, config.activeScenario);
      if (mockResult) {
        setTimeout(() => {
          Object.defineProperty(this, "status", { value: mockResult.status, writable: false });
          Object.defineProperty(this, "responseText", { value: mockResult.bodyText, writable: false });
          Object.defineProperty(this, "response", { value: mockResult.bodyText, writable: false });
          Object.defineProperty(this, "readyState", { value: 4, writable: false });

          const duration = Math.round(performance.now() - meta.startTime);
          emitMessage("TRAFFIC_LOG", {
            url: meta.url,
            method: meta.method,
            requestHeaders: meta.headers,
            requestPayload: meta.requestPayload,
            responseStatus: mockResult.status,
            responsePayload: mockResult.bodyText,
            timestamp: meta.timestamp,
            duration,
            simulated: true,
            wasModifiedFor30s: meta.wasModifiedFor30s,
            wasModifiedFor1080p: meta.wasModifiedFor1080p,
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
      const resText = this.responseText || "";

      // Extract videos from XHR response
      inspectAndExtractVideos(meta.url, resText);

      emitMessage("TRAFFIC_LOG", {
        url: meta.url,
        method: meta.method,
        requestHeaders: meta.headers,
        requestPayload: meta.requestPayload,
        responseStatus: this.status,
        responsePayload: resText || "[No content]",
        timestamp: meta.timestamp,
        duration,
        simulated: false,
        wasModifiedFor30s: meta.wasModifiedFor30s,
        wasModifiedFor1080p: meta.wasModifiedFor1080p,
      });
    });

    return originalXHRSend.call(this, outgoingBody);
  };

  /* ── 4. Mock Scenario Generator (Local Test Harness) ── */
  function getMockResponse(url, scenario) {
    const isTarget = /\b(credit|balance|user|limits|generate|render|task|video)\b/i.test(url);
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
            message: "[SIMULATION] Plan expired.",
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
            message: "[SIMULATION] Server rejected request: High Demand / Quota exceeded.",
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
            tier: "DOLA_AI_PRO_UNLIMITED",
          }),
        };

      default:
        return null;
    }
  }

  console.info("⚡ [Dola AI Pro Engine v3.1] 30s Force Override & Strict 1080p Engine active.");
})();
