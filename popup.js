/* ─────────────────────────────────────────────────────────
   Dola AI Pro — popup.js (ShamodPro v3 Engine)
──────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

let dolaConfig = {
  mode: "active",
  enable30s: true,
  strict1080p: true,
  fixHighDemand: true,
  removeWatermark: true,
  enableSeedance: true,
  activeScenario: "none"
};

let trafficLogs = [];
let queueItems = [];
let capturedVideos = [];

// Built-in 30-Second Cinematic Presets from SKILL.md
const PRESETS = {
  stage_flourish: {
    beat1: "Vertical 9:16 framing, 50mm prime lens at f/1.8. Dramatic theatrical stage lighting with deep cobalt background and warm golden spotlight on the hands. The performer maintains calm stage presence, chest breathing naturally, eyes focused forward.",
    beat2: "Slow steadicam push-in toward the hands. The performer executes a smooth, deliberate card flourish, fanning the deck into an arc across both hands at 24fps. One single card is turned cleanly toward the camera with measured, realistic weight.",
    beat3: "Camera slowly pulls back to medium framing as the card fan closes cleanly back into the deck. Atmospheric stage dust particles glint softly in the spotlight beam, lingering in cinematic stillness."
  },
  hollywood: {
    beat1: "Shot on 35mm anamorphic lens, Arri Alexa LF, shallow depth of field, f/2.0. Soft directional golden-hour sunlight pouring through haze, subtle rim lighting, natural specular highlights. Weathered artisan in linen tunic, visible skin texture, fine stubble.",
    beat2: "Steadicam slowly advances at chest level. Artisan carefully lifts an antique brass astrolabe toward the light, checking astronomical alignment with slow, deliberate physical weight.",
    beat3: "Camera slowly orbits 20 degrees to reveal sunbeam refraction through dust particles, settling into a wide cinematic frame. Kodak Vision3 500T color grading, organic subtle 35mm film grain, 24fps motion blur."
  },
  steadicam: {
    beat1: "Shot on 50mm prime lens, f/1.4 aperture. Deep blue hour twilight in a cobblestone coastal European alleyway, warm glowing practical street lanterns casting wet reflections.",
    beat2: "Smooth steadicam tracking shot behind a solitary traveler in dark tailored overcoat walking steadily forward, mist rising from damp stone pavers, breath lightly condensing.",
    beat3: "Traveler pauses at alley opening, camera gently pans to reveal panoramic harbor with twinkling lighthouse beams, lingering on cold atmospheric ocean air."
  },
  macro: {
    beat1: "Laowa 24mm probe macro lens, f/8, ultra-close perspective. Hot cast-iron skillet surface, micro droplets of rosemary-infused olive oil glistening under soft diffused studio top light.",
    beat2: "Slow horizontal probe movement at 24fps. Sizzling sprig of fresh green rosemary meets the hot pan, micro oil bubbles bursting into fine mist with realistic fluid dynamics.",
    beat3: "Probe pulls smoothly backward revealing pristine copper cookware and dark textured slate background, lingering on rising delicate steam wisps."
  },
  cyberpunk: {
    beat1: "Shot on 35mm anamorphic, neon teal and magenta dual-source rim lighting. High-density rainy neo-Tokyo skybridge, holographic reflections shimmering on wet carbon fiber jacket.",
    beat2: "Slow orbital tracking arc at 24fps. Cybernetic courier taps luminous wrist interface, translucent data streams projecting briefly into cold rain before dispersing.",
    beat3: "Camera pulls back through cascading rain droplets revealing towering illuminated megacity spires disappearing into low-hanging clouds."
  },
  nature: {
    beat1: "Shot on 35mm anamorphic lens. Ancient misty evergreen forest, early morning god rays piercing towering canopy, damp moss carpet glowing softly.",
    beat2: "Slow steadicam push-in. Lone mountaineer in wax-canvas jacket halts on ridge, raises vintage brass binoculars to inspect distant valley.",
    beat3: "Camera smoothly booms up and pulls back to reveal immense sunlit mountain range rising above cloud blanket, pine needles rustling in gentle wind."
  }
};

/* ── 1. Boot & Storage Sync ─────────────────────────── */
async function init() {
  const data = await chrome.storage.local.get([
    "dola_config",
    "harness_traffic_log",
    "dola_queue",
    "captured_videos"
  ]);

  if (data.dola_config) {
    Object.assign(dolaConfig, data.dola_config);
  }

  // Sync checkboxes
  $("toggle30s").checked = dolaConfig.enable30s !== false;
  $("toggle1080p").checked = dolaConfig.strict1080p !== false;
  $("toggleHighDemand").checked = dolaConfig.fixHighDemand !== false;
  $("toggleNoWatermark").checked = dolaConfig.removeWatermark !== false;
  $("toggleSeedance").checked = dolaConfig.enableSeedance !== false;

  // Sync mock scenario
  if (dolaConfig.activeScenario) {
    $("mockScenarioSelect").value = dolaConfig.activeScenario;
  }
  updateStatusBadge();

  // Load lists
  trafficLogs = data.harness_traffic_log || [];
  renderTrafficTable();

  capturedVideos = data.captured_videos || [];
  renderVideosList();

  queueItems = data.dola_queue || [];
  renderQueue();

  // Initial prompt setup
  loadPreset("hollywood");

  // Check WebCodecs support
  checkGlobalWebCodecs();
}

function updateStatusBadge() {
  const badge = $("engineStatusBadge");
  if (dolaConfig.enable30s && dolaConfig.strict1080p) {
    badge.textContent = "30s · 1080p ACTIVE";
    badge.className = "security-badge active";
  } else if (dolaConfig.enable30s) {
    badge.textContent = "30s ACTIVE";
    badge.className = "security-badge active";
  } else {
    badge.textContent = "STANDARD";
    badge.className = "security-badge disabled";
  }
}

async function saveConfig() {
  await chrome.storage.local.set({ dola_config: dolaConfig });
  updateStatusBadge();

  // Notify active tab content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "UPDATE_DOLA_CONFIG",
        payload: dolaConfig
      });
    }
  } catch (_) { }
}

// Checkbox event listeners
$("toggle30s").onchange = (e) => {
  dolaConfig.enable30s = e.target.checked;
  saveConfig();
};
$("toggle1080p").onchange = (e) => {
  dolaConfig.strict1080p = e.target.checked;
  saveConfig();
};
$("toggleHighDemand").onchange = (e) => {
  dolaConfig.fixHighDemand = e.target.checked;
  saveConfig();
};
$("toggleNoWatermark").onchange = (e) => {
  dolaConfig.removeWatermark = e.target.checked;
  saveConfig();
};
$("toggleSeedance").onchange = (e) => {
  dolaConfig.enableSeedance = e.target.checked;
  saveConfig();
};
$("mockScenarioSelect").onchange = (e) => {
  dolaConfig.activeScenario = e.target.value;
  dolaConfig.mode = e.target.value === "none" ? "active" : "modify";
  saveConfig();
};

/* ── 2. Navigation Tabs ─────────────────────────────── */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    $("pane-" + btn.dataset.tab).classList.add("active");
  });
});

/* ── 3. 30s Cinematic Prompt Engine ─────────────────── */
function loadPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  $("beat1Input").value = p.beat1;
  $("beat2Input").value = p.beat2;
  $("beat3Input").value = p.beat3;
  buildMasterPrompt();
}

function buildMasterPrompt() {
  const b1 = $("beat1Input").value.trim();
  const b2 = $("beat2Input").value.trim();
  const b3 = $("beat3Input").value.trim();

  const parts = [];
  if (b1) parts.push(`(0–8s Establish) ${b1}`);
  if (b2) parts.push(`(8–22s Core Action) ${b2}`);
  if (b3) parts.push(`(22–30s Cinematic Resolve) ${b3}`);

  // Add realistic physics & negative guidelines (from SKILL.md)
  parts.push("Organic 35mm film grain, 24fps motion blur, realistic cloth simulation. Negative: plastic skin, 3D CGI videogame render, oversaturated colors, morphing limbs, sudden jump cuts.");

  $("masterPromptPreview").value = parts.join(" ");
}

$("presetSelect").onchange = (e) => {
  if (e.target.value) {
    loadPreset(e.target.value);
  }
};

$("buildPromptBtn").onclick = () => buildMasterPrompt();

async function sendPromptToActiveTab(text) {
  if (!text) {
    showPromptMsg("Prompt is empty", true);
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    showPromptMsg("No active tab found", true);
    return;
  }

  const url = tab.url || "";
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:")) {
    showPromptMsg("⚠️ Open dola.com or trydola.com in this tab first!", true);
    return;
  }

  async function trySend() {
    return await chrome.tabs.sendMessage(tab.id, { type: "insert", text });
  }

  try {
    let res;
    try {
      res = await trySend();
    } catch (err) {
      // Content script may not be loaded if the page was opened before installing/reloading the extension
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        await new Promise((r) => setTimeout(r, 200));
        res = await trySend();
      } catch (injectErr) {
        showPromptMsg("Please refresh (F5) the Dola AI tab once, then click Insert again.", true);
        return;
      }
    }

    if (res && res.ok) {
      showPromptMsg("✅ Prompt inserted into Dola AI!");
    } else {
      showPromptMsg(res?.error || "Click into Dola's prompt input on the page first.", true);
    }
  } catch (err) {
    showPromptMsg("Please refresh (F5) your Dola AI tab and try again.", true);
  }
}

$("insertDolaBtn").onclick = () => {
  const text = $("masterPromptPreview").value.trim();
  sendPromptToActiveTab(text);
};

$("copyPromptBtn").onclick = async () => {
  const text = $("masterPromptPreview").value.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  showPromptMsg("📋 Copied master prompt to clipboard!");
};

$("addQueueBtn").onclick = async () => {
  const text = $("masterPromptPreview").value.trim();
  if (!text) return;
  queueItems.push({ text, done: false });
  await chrome.storage.local.set({ dola_queue: queueItems });
  renderQueue();
  showPromptMsg("Added to prompt queue!");
};

function showPromptMsg(msg, isErr = false) {
  const el = $("promptMsg");
  el.textContent = msg;
  el.className = `status-msg ${isErr ? "err" : "ok"}`;
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = "";
  }, 4000);
}

function renderQueue() {
  const list = $("queueList");
  list.innerHTML = "";
  $("queueProgress").textContent = `Queue (${queueItems.length} items)`;

  queueItems.forEach((item, idx) => {
    const li = document.createElement("li");
    if (item.done) li.className = "done";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = item.done;
    chk.onchange = async () => {
      item.done = chk.checked;
      await chrome.storage.local.set({ dola_queue: queueItems });
      renderQueue();
    };

    const span = document.createElement("span");
    span.textContent = item.text;
    span.title = item.text;

    const quickInsert = document.createElement("button");
    quickInsert.className = "del-btn";
    quickInsert.style.color = "var(--cyan)";
    quickInsert.textContent = "⚡";
    quickInsert.title = "Insert this prompt into Dola";
    quickInsert.onclick = async () => {
      await sendPromptToActiveTab(item.text);
      item.done = true;
      await chrome.storage.local.set({ dola_queue: queueItems });
      renderQueue();
    };

    const del = document.createElement("button");
    del.className = "del-btn";
    del.textContent = "✕";
    del.onclick = async () => {
      queueItems.splice(idx, 1);
      await chrome.storage.local.set({ dola_queue: queueItems });
      renderQueue();
    };

    li.append(chk, span, quickInsert, del);
    list.appendChild(li);
  });
}

$("clearQueueBtn").onclick = async () => {
  queueItems = [];
  await chrome.storage.local.set({ dola_queue: [] });
  renderQueue();
};

/* ── 4. Captured Videos List ────────────────────────── */
function renderVideosList() {
  const list = $("videosList");
  const count = $("videoCount");
  if (count) count.textContent = capturedVideos.length;

  if (capturedVideos.length === 0) {
    list.innerHTML = `<div class="empty-state">No videos intercepted yet. Generate a video on Dola AI to capture the clean stream.</div>`;
    return;
  }

  list.innerHTML = "";
  capturedVideos.forEach((v) => {
    const card = document.createElement("div");
    card.className = "video-card";

    const info = document.createElement("div");
    info.className = "video-card-info";

    const title = document.createElement("div");
    title.className = "video-card-title";
    title.textContent = v.name || "Dola 30s Video (Clean MP4)";

    const meta = document.createElement("div");
    meta.className = "video-card-meta";
    meta.textContent = new Date(v.timestamp).toLocaleTimeString() + " · Unwatermarked";

    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "video-card-actions";

    const dlBtn = document.createElement("a");
    dlBtn.className = "dl-action-btn";
    dlBtn.href = v.url;
    dlBtn.download = v.name || "dola-30s-video.mp4";
    dlBtn.target = "_blank";
    dlBtn.textContent = "⬇️ Download";

    actions.appendChild(dlBtn);
    card.append(info, actions);
    list.appendChild(card);
  });
}

$("clearVideosBtn").onclick = async () => {
  capturedVideos = [];
  await chrome.storage.local.set({ captured_videos: [] });
  renderVideosList();
};

/* ── 5. Traffic Log Rendering ───────────────────────── */
function renderTrafficTable() {
  const tbody = $("trafficTableBody");
  const count = $("trafficCount");
  if (count) count.textContent = trafficLogs.length;

  if (trafficLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No requests intercepted yet. Active on dola.com, trydola.com, doubao.com, and localhost.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  trafficLogs.forEach((log) => {
    const tr = document.createElement("tr");

    const statusTd = document.createElement("td");
    const statusPill = document.createElement("span");
    const isOk = log.responseStatus >= 200 && log.responseStatus < 300;
    statusPill.className = `status-pill ${isOk ? "ok" : log.responseStatus === 402 || log.responseStatus === 429 ? "warn" : "err"}`;
    statusPill.textContent = log.responseStatus || "ERR";
    statusTd.appendChild(statusPill);

    const modTd = document.createElement("td");
    let hasMod = false;
    if (log.wasModifiedFor30s) {
      const p30 = document.createElement("span");
      p30.className = "pill-30s";
      p30.textContent = "30s";
      p30.title = "Duration parameter patched to 30s";
      modTd.appendChild(p30);
      hasMod = true;
    }
    if (log.wasModifiedFor1080p) {
      const p1080 = document.createElement("span");
      p1080.className = "pill-1080p";
      p1080.textContent = "1080p";
      p1080.title = "Resolution strictly enforced to 1080p";
      modTd.appendChild(p1080);
      hasMod = true;
    }
    if (!hasMod) {
      modTd.textContent = "—";
    }

    const methodTd = document.createElement("td");
    methodTd.textContent = log.method;

    const urlTd = document.createElement("td");
    try {
      const parsed = new URL(log.url);
      urlTd.textContent = parsed.pathname.slice(-25);
      urlTd.title = log.url;
    } catch (_) {
      urlTd.textContent = String(log.url).slice(-25);
    }

    const timeTd = document.createElement("td");
    timeTd.textContent = `${log.duration}ms`;

    tr.append(statusTd, modTd, methodTd, urlTd, timeTd);
    tr.onclick = () => showPayloadDrawer(log, tr);

    tbody.appendChild(tr);
  });
}

function showPayloadDrawer(log, row) {
  document.querySelectorAll("#trafficTableBody tr").forEach((r) => r.classList.remove("selected"));
  if (row) row.classList.add("selected");

  const tags = [];
  if (log.wasModifiedFor30s) tags.push("30s");
  if (log.wasModifiedFor1080p) tags.push("1080p");
  const tagStr = tags.length ? `[${tags.join(" · ")} ENFORCED]` : "";
  $("drawerTitle").textContent = `${log.method} ${log.responseStatus} (${log.duration}ms) ${tagStr}`;
  $("detailUrl").textContent = log.url;

  $("detailReqPayload").textContent = log.requestPayload
    ? (typeof log.requestPayload === "object" ? JSON.stringify(log.requestPayload, null, 2) : log.requestPayload)
    : "[No Request Payload]";

  try {
    const parsed = JSON.parse(log.responsePayload);
    $("detailResPayload").textContent = JSON.stringify(parsed, null, 2);
  } catch (_) {
    $("detailResPayload").textContent = log.responsePayload || "[Empty Body]";
  }

  $("payloadDrawer").style.display = "block";
}

$("closeDrawer").onclick = () => {
  $("payloadDrawer").style.display = "none";
  document.querySelectorAll("#trafficTableBody tr").forEach((r) => r.classList.remove("selected"));
};

$("clearTraffic").onclick = async () => {
  trafficLogs = [];
  await chrome.storage.local.set({ harness_traffic_log: [] });
  renderTrafficTable();
  $("payloadDrawer").style.display = "none";
};

// Live traffic listener from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "NEW_TRAFFIC_LOG") {
    trafficLogs.unshift({ id: Date.now(), ...msg.log });
    if (trafficLogs.length > 100) trafficLogs.pop();
    renderTrafficTable();
  }
});

/* ── 6. HEVC Extractor & Decoder Logic ──────────────── */
async function checkGlobalWebCodecs() {
  const statusEl = $("hevcWebCodecsStatus");
  if (!statusEl) return;
  if (typeof VideoDecoder === "undefined") {
    statusEl.textContent = "WebCodecs: Unsupported";
    return;
  }
  try {
    const res = await VideoDecoder.isConfigSupported({ codec: "hvc1.1.6.L93.B0" });
    if (res.supported) {
      statusEl.textContent = "WebCodecs: Hardware HEVC Ready";
      statusEl.className = "mode-badge test";
    } else {
      statusEl.textContent = "WebCodecs: Software Fallback";
    }
  } catch (_) {
    statusEl.textContent = "WebCodecs Ready";
  }
}

let activeWebDecoder = null;

$("hevcFileInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const buffer = reader.result;
    try {
      const inspector = new window.HEVCInspector(buffer);
      const meta = inspector.inspect();

      $("hevcMetadataCard").style.display = "block";
      $("hevcCodecBadge").textContent = meta.codec.toUpperCase();
      $("metaRes").textContent = `${meta.width} × ${meta.height}`;
      $("metaProfile").textContent = `${meta.profile} (${meta.tier})`;
      $("metaLevel").textContent = meta.level;
      $("metaCodecStr").textContent = meta.codecString;
      $("metaDuration").textContent = `${meta.duration}s`;

      const canvas = $("hevcCanvas");
      activeWebDecoder = new window.HEVCWebDecoder(canvas);
      const support = await activeWebDecoder.checkCodecSupport(meta.codecString);

      if (support.supported) {
        $("hevcWebCodecsStatus").textContent = "Decoder Ready";
        $("hevcWebCodecsStatus").className = "mode-badge test";
        $("canvasPreviewBox").style.display = "block";
      } else {
        $("hevcWebCodecsStatus").textContent = "Decoder: " + support.reason;
      }
    } catch (err) {
      alert("HEVC Inspection Failed: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};

$("exportFrameBtn").onclick = () => {
  if (!activeWebDecoder) return;
  const dataUrl = activeWebDecoder.exportCurrentFramePNG();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `dola-30s-frame-${Date.now()}.png`;
  a.click();
};

// Initialize
init();
