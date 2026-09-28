// content.js — Security Harness & DOM Relay
const ALLOWLISTED_HOSTS = ["localhost", "127.0.0.1"];

function isAllowedHost() {
  const host = window.location.hostname;
  return ALLOWLISTED_HOSTS.some((h) => host === h || host.endsWith("." + h));
}

// 1. Inject In-Page Interceptor into main world if on allowlisted test target
if (isAllowedHost()) {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inpage-interceptor.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    // Sync saved harness configuration
    chrome.storage.local.get(["harness_config"], (res) => {
      if (res.harness_config) {
        window.postMessage({
          source: "HELLO_DOLA_CONTENT_RELAY",
          type: "UPDATE_CONFIG",
          payload: res.harness_config,
        }, "*");
      }
    });
  } catch (err) {
    console.error("[Harness Relay] Script injection error:", err);
  }
}

// 2. Relay intercepted traffic logs from in-page script to extension storage / popup
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.source !== "HELLO_DOLA_HARNESS") return;

  if (event.data.type === "TRAFFIC_LOG") {
    // Append to circular storage log (keep last 100 entries)
    chrome.storage.local.get(["harness_traffic_log"], (res) => {
      const logs = res.harness_traffic_log || [];
      logs.unshift({
        id: Date.now() + Math.random().toString(36).substr(2, 4),
        ...event.data.payload,
      });
      if (logs.length > 100) logs.pop();
      chrome.storage.local.set({ harness_traffic_log: logs });
    });

    // Notify popup if active
    chrome.runtime.sendMessage({
      type: "NEW_TRAFFIC_LOG",
      log: event.data.payload,
    }).catch(() => { }); // popup might be closed
  }
});

// 3. Listen for commands from popup to update in-page config
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "UPDATE_HARNESS_CONFIG") {
    window.postMessage({
      source: "HELLO_DOLA_CONTENT_RELAY",
      type: "UPDATE_CONFIG",
      payload: msg.payload,
    }, "*");
    reply({ ok: true });
    return true;
  }

  // Preserve existing prompt insertion logic for compatibility
  if (msg && msg.type === "insert") {
    reply(insertText(msg.text));
    return true;
  }
});

/* ── Standard Prompt Injection & DOM Selection ───────── */
let lastEditable = null;

function isEditable(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT" && /^(text|search)?$/i.test(el.type)) return true;
  return el.isContentEditable === true;
}

document.addEventListener("focusin", (e) => {
  if (isEditable(e.target)) lastEditable = e.target;
});

function findTarget() {
  if (isEditable(document.activeElement)) return document.activeElement;
  if (lastEditable && document.contains(lastEditable)) return lastEditable;
  return (
    document.querySelector("[data-testid='prompt-input']") ||
    document.querySelector("textarea, [contenteditable='true']")
  );
}

function insertText(text) {
  const el = findTarget();
  if (!el) {
    return {
      ok: false,
      error: "No text box found. Click into the prompt input first.",
    };
  }
  el.focus();
  if (el.isContentEditable) {
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
  } else {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return { ok: true };
}
