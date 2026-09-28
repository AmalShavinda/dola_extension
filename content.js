// content.js — Dola AI Pro Content Script & DOM Relay
const SUPPORTED_HOSTS = [
  "dola.com",
  "trydola.com",
  "dola.ai",
  "doubao.com",
  "localhost",
  "127.0.0.1"
];

function isSupportedHost() {
  const host = window.location.hostname.toLowerCase();
  return SUPPORTED_HOSTS.some((h) => host === h || host.endsWith("." + h));
}

// 1. Inject In-Page Interceptor into main world execution realm
try {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inpage-interceptor.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Sync saved extension configuration
  chrome.storage.local.get(["dola_config"], (res) => {
    const config = res.dola_config || {
      mode: "active",
      enable30s: true,
      strict1080p: true,
      fixHighDemand: true,
      removeWatermark: true,
      enableSeedance: true,
      activeScenario: "none"
    };
    window.postMessage({
      source: "DOLA_AI_PRO_RELAY",
      type: "UPDATE_CONFIG",
      payload: config,
    }, "*");
  });
} catch (err) {
  console.error("[Dola Pro Relay] Failed to inject interceptor:", err);
}

// 2. Relay events from in-page script to extension storage / popup / UI
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.source !== "DOLA_AI_PRO_HARNESS") return;

  // Handle live traffic logging
  if (event.data.type === "TRAFFIC_LOG") {
    chrome.storage.local.get(["harness_traffic_log"], (res) => {
      const logs = res.harness_traffic_log || [];
      logs.unshift({
        id: Date.now() + Math.random().toString(36).substr(2, 4),
        ...event.data.payload,
      });
      if (logs.length > 100) logs.pop();
      chrome.storage.local.set({ harness_traffic_log: logs });
    });

    chrome.runtime.sendMessage({
      type: "NEW_TRAFFIC_LOG",
      log: event.data.payload,
    }).catch(() => { });
  }

  // Handle High Demand auto-retry notification
  if (event.data.type === "HIGH_DEMAND_RETRY") {
    const { attempt, maxRetries, delayMs } = event.data.payload;
    showOnPageToast(
      `⚠️ High Demand Detected: Auto-retrying generation (Attempt ${attempt}/${maxRetries}) in ${(delayMs / 1000).toFixed(1)}s...`,
      "warn"
    );
  }

  // Handle Captured Video Stream URL
  if (event.data.type === "VIDEO_CAPTURED") {
    const { videoUrls, sourceUrl, timestamp } = event.data.payload;
    if (videoUrls && videoUrls.length > 0) {
      chrome.storage.local.get(["captured_videos"], (res) => {
        const list = res.captured_videos || [];
        videoUrls.forEach((u) => {
          if (!list.some((item) => item.url === u)) {
            list.unshift({
              url: u,
              sourceUrl,
              timestamp,
              name: `dola-30s-${Date.now().toString().slice(-6)}.mp4`
            });
          }
        });
        if (list.length > 30) list.pop();
        chrome.storage.local.set({ captured_videos: list });
      });

      // Show floating download badge on page
      showFloatingDownloadWidget(videoUrls[0]);
    }
  }
});

// 3. Listen for commands from popup
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "UPDATE_DOLA_CONFIG") {
    window.postMessage({
      source: "DOLA_AI_PRO_RELAY",
      type: "UPDATE_CONFIG",
      payload: msg.payload,
    }, "*");
    reply({ ok: true });
    return true;
  }

  if (msg && msg.type === "insert") {
    reply(insertPromptIntoDola(msg.text));
    return true;
  }
});

/* ── 4. On-Page Floating Widget for Direct Video Download ── */
let floatingWidget = null;

function showFloatingDownloadWidget(videoUrl) {
  if (!floatingWidget) {
    floatingWidget = document.createElement("div");
    floatingWidget.id = "dola-pro-floating-widget";
    floatingWidget.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
      border: 1px solid #38bdf8;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(56,189,248,0.3);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      font-size: 13px;
      animation: dolaSlideIn 0.3s ease;
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes dolaSlideIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .dola-dl-btn {
        background: #38bdf8;
        color: #0f172a;
        font-weight: 700;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        font-size: 12px;
      }
      .dola-dl-btn:hover { background: #7dd3fc; }
      .dola-close-btn {
        background: transparent;
        color: #94a3b8;
        border: none;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 4px;
      }
      .dola-close-btn:hover { color: #fff; }
    `;
    document.head.appendChild(styleEl);
    document.body.appendChild(floatingWidget);
  }

  floatingWidget.innerHTML = `
    <span style="font-size: 18px;">🎬</span>
    <div>
      <div style="font-weight: 700; color: #38bdf8;">Clean 30s Video Ready</div>
      <div style="color: #94a3b8; font-size: 11px;">Watermark removed · Seedance 2.5</div>
    </div>
    <a href="${videoUrl}" download="dola-30s-${Date.now()}.mp4" target="_blank" class="dola-dl-btn">
      ⬇️ Download MP4
    </a>
    <button class="dola-close-btn" title="Dismiss">✕</button>
  `;

  floatingWidget.style.display = "flex";
  floatingWidget.querySelector(".dola-close-btn").onclick = () => {
    floatingWidget.style.display = "none";
  };
}

/* ── 5. On-Page Toast Notification System ──────────────── */
let toastTimeout = null;

function showOnPageToast(text, type = "info") {
  let toast = document.getElementById("dola-pro-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "dola-pro-toast";
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }

  if (type === "warn") {
    toast.style.background = "#d97706";
    toast.style.border = "1px solid #f59e0b";
  } else if (type === "success") {
    toast.style.background = "#059669";
    toast.style.border = "1px solid #10b981";
  } else {
    toast.style.background = "#0284c7";
    toast.style.border = "1px solid #38bdf8";
  }

  toast.textContent = text;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
  }, 4000);
}

/* ── 6. Robust Prompt Injector for Dola AI / Doubao / Web ─ */
let lastEditable = null;

function isInputLike(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
  return el.isContentEditable === true;
}

document.addEventListener("focusin", (e) => {
  if (isInputLike(e.target)) lastEditable = e.target;
}, true);

document.addEventListener("click", (e) => {
  if (isInputLike(e.target)) lastEditable = e.target;
}, true);

function findDolaPromptInput() {
  if (lastEditable && document.contains(lastEditable)) {
    return lastEditable;
  }
  if (document.activeElement && isInputLike(document.activeElement)) {
    return document.activeElement;
  }

  const candidates = [
    document.querySelector("[data-testid='prompt-input']"),
    document.querySelector("[data-testid='chat-input']"),
    document.querySelector(".semi-input-textarea"),
    document.querySelector(".chat-input textarea"),
    document.querySelector(".chat-input [contenteditable='true']"),
    document.querySelector("div[data-lexical-editor='true']"),
    document.querySelector("div[data-slate-editor='true']"),
    document.querySelector("textarea[placeholder*='prompt' i]"),
    document.querySelector("textarea[placeholder*='describe' i]"),
    document.querySelector("textarea[placeholder*='video' i]"),
    document.querySelector("textarea[placeholder*='ask' i]"),
    document.querySelector("textarea[placeholder*='message' i]"),
    document.querySelector("div[contenteditable='true'][placeholder*='prompt' i]"),
    document.querySelector("textarea"),
    document.querySelector("div[contenteditable='true']"),
    document.querySelector("[role='textbox']")
  ];

  for (const el of candidates) {
    if (el && document.contains(el)) return el;
  }
  return null;
}

function insertPromptIntoDola(text) {
  const el = findDolaPromptInput();
  if (!el) {
    return {
      ok: false,
      error: "No text box found. Click into Dola's prompt input on the page first, then click Insert.",
    };
  }

  el.focus();

  if (el.isContentEditable) {
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) {}

    const ok = document.execCommand("insertText", false, text);
    if (!ok) {
      el.textContent = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  } else {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  showOnPageToast("✅ 30-Second Cinematic Prompt injected into Dola AI!", "success");
  return { ok: true };
}

/* ── 7. Active DOM UI Auto-Unlocker (30s & 1080p UI Auto-Clicker) ─ */
function scanAndEnforceDOMControls() {
  const elements = Array.from(document.querySelectorAll("button, [role='radio'], [role='tab'], .chip, .tag, span, div"));
  for (const el of elements) {
    const text = (el.textContent || "").trim();

    // 1. Resolution Auto-Select (1080p / HD)
    if (/^(1080p|1080P|Full HD|HD 1080p)$/i.test(text)) {
      const isSelected = el.classList.contains("active") || el.getAttribute("aria-checked") === "true" || el.classList.contains("selected");
      if (!isSelected && el.offsetParent !== null && typeof el.click === "function") {
        el.click();
        console.log("⚡ [Dola Pro] Automatically selected 1080p resolution in UI");
      }
    }

    // 2. Duration Auto-Unlock & Select (30s)
    if (/^(30s|30 seconds|30秒)$/i.test(text)) {
      if (el.hasAttribute("disabled")) el.removeAttribute("disabled");
      if (el.getAttribute("aria-disabled") === "true") el.setAttribute("aria-disabled", "false");
      el.classList.remove("disabled", "is-disabled");
      const isSelected = el.classList.contains("active") || el.getAttribute("aria-checked") === "true" || el.classList.contains("selected");
      if (!isSelected && el.offsetParent !== null && typeof el.click === "function") {
        el.click();
        console.log("⚡ [Dola Pro] Automatically unlocked and selected 30s duration in UI");
      }
    }

    // 3. Seedance 2.5 Model Auto-Select
    if (/^Seedance\s*2\.5/i.test(text)) {
      const isSelected = el.classList.contains("active") || el.getAttribute("aria-checked") === "true" || el.classList.contains("selected");
      if (!isSelected && el.offsetParent !== null && typeof el.click === "function") {
        el.click();
        console.log("⚡ [Dola Pro] Automatically selected Seedance 2.5 in UI");
      }
    }
  }
}

// Observe DOM mutations & poll every 2s
const domObserver = new MutationObserver(() => scanAndEnforceDOMControls());
if (document.body) {
  domObserver.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    domObserver.observe(document.body, { childList: true, subtree: true });
  });
}
setInterval(scanAndEnforceDOMControls, 2000);

/* ── 8. On-Page Dola Pro Active Badge ──────────────────── */
function renderDolaProStatusBadge() {
  if (document.getElementById("dola-pro-active-badge")) return;
  const badge = document.createElement("div");
  badge.id = "dola-pro-active-badge";
  badge.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 999998;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(6, 182, 212, 0.4);
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    border-radius: 99px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #f8fafc;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    user-select: none;
  `;
  badge.innerHTML = `
    <span style="color: #06b6d4;">⚡</span>
    <span>Dola Pro:</span>
    <span style="background: rgba(6,182,212,0.25); color: #38bdf8; padding: 2px 7px; border-radius: 4px; font-weight: 700;">30s Forced</span>
    <span style="background: rgba(16,185,129,0.25); color: #34d399; padding: 2px 7px; border-radius: 4px; font-weight: 700;">1080p Strict</span>
    <span style="color: #94a3b8;">· Seedance 2.5</span>
  `;
  (document.body || document.documentElement).appendChild(badge);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderDolaProStatusBadge);
} else {
  renderDolaProStatusBadge();
}

