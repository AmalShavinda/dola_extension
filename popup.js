/* ─────────────────────────────────────────────────────────
   hello_dola — popup.js (Security Testing & HEVC Harness)
──────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

let harnessConfig = {
  mode: "observe",            // "disabled" | "observe" | "modify"
  activeScenario: "none",
  allowlist: ["localhost", "127.0.0.1"],
};

let trafficLogs = [];
let queueItems = [];

/* ── Boot & Storage Sync ────────────────────────────── */
async function init() {
  // Load harness config
  const cfg = await chrome.storage.local.get(["harness_config", "harness_traffic_log", "harness_queue"]);
  if (cfg.harness_config) {
    Object.assign(harnessConfig, cfg.harness_config);
  }

  // Sync controls
  $("harnessModeSelect").value = harnessConfig.mode;
  $("harnessMasterToggle").checked = harnessConfig.mode !== "disabled";
  updateStatusBadge();

  // Sync active scenario radio
  const radio = document.querySelector(`input[name="scenarioRadio"][value="${harnessConfig.activeScenario}"]`);
  if (radio) radio.checked = true;

  // Load traffic logs
  trafficLogs = cfg.harness_traffic_log || [];
  renderTrafficTable();

  // Load queue
  queueItems = cfg.harness_queue || [];
  renderQueue();

  // Render audit log
  renderAuditLogs();

  // Check WebCodecs capability in popup
  checkGlobalWebCodecs();
}

/* ── Tab Switching ──────────────────────────────────── */
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

/* ── Harness Configuration Handlers ─────────────────── */
function updateStatusBadge() {
  const badge = $("harnessStatusBadge");
  const mode = harnessConfig.mode.toUpperCase();
  badge.textContent = `${mode} MODE`;
  badge.className = `security-badge ${harnessConfig.mode}`;
}

async function saveHarnessConfig() {
  await chrome.storage.local.set({ harness_config: harnessConfig });
  updateStatusBadge();

  // Notify active tab content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: "UPDATE_HARNESS_CONFIG",
        payload: harnessConfig,
      });
    }
  } catch (_) {}
}

$("harnessMasterToggle").onchange = () => {
  if (!$("harnessMasterToggle").checked) {
    harnessConfig.mode = "disabled";
  } else {
    harnessConfig.mode = $("harnessModeSelect").value === "disabled" ? "observe" : $("harnessModeSelect").value;
  }
  $("harnessModeSelect").value = harnessConfig.mode;
  saveHarnessConfig();
};

$("harnessModeSelect").onchange = () => {
  harnessConfig.mode = $("harnessModeSelect").value;
  $("harnessMasterToggle").checked = harnessConfig.mode !== "disabled";
  saveHarnessConfig();
};

// Scenario radios
document.querySelectorAll('input[name="scenarioRadio"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    harnessConfig.activeScenario = e.target.value;
    if (harnessConfig.activeScenario !== "none" && harnessConfig.mode === "observe") {
      // Auto-switch to Modify mode when picking a scenario
      harnessConfig.mode = "modify";
      $("harnessModeSelect").value = "modify";
    }
    saveHarnessConfig();
    logAuditEvent("SCENARIO_CHANGED", `Activated scenario: ${harnessConfig.activeScenario}`);
  });
});

/* ── Traffic Log Rendering ──────────────────────────── */
function renderTrafficTable() {
  const tbody = $("trafficTableBody");
  const countBadge = $("trafficCount");
  if (countBadge) countBadge.textContent = trafficLogs.length;

  if (trafficLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No requests intercepted yet. Ensure you are on http://localhost or http://127.0.0.1</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  trafficLogs.forEach((log, index) => {
    const tr = document.createElement("tr");

    const statusTd = document.createElement("td");
    const statusPill = document.createElement("span");
    const isOk = log.responseStatus >= 200 && log.responseStatus < 300;
    statusPill.className = `status-pill ${isOk ? "ok" : log.responseStatus === 402 ? "warn" : "err"}`;
    statusPill.textContent = log.responseStatus || "ERR";
    if (log.simulated) statusPill.title = `Simulated by: ${log.scenario}`;
    statusTd.appendChild(statusPill);

    const methodTd = document.createElement("td");
    methodTd.textContent = log.method;

    const urlTd = document.createElement("td");
    try {
      const parsed = new URL(log.url);
      urlTd.textContent = parsed.pathname + parsed.search;
      urlTd.title = log.url;
    } catch (_) {
      urlTd.textContent = log.url;
    }

    const timeTd = document.createElement("td");
    timeTd.textContent = `${log.duration}ms`;

    tr.append(statusTd, methodTd, urlTd, timeTd);
    tr.onclick = () => showPayloadDrawer(log, tr);

    tbody.appendChild(tr);
  });
}

function showPayloadDrawer(log, rowElement) {
  document.querySelectorAll("#trafficTableBody tr").forEach((r) => r.classList.remove("selected"));
  if (rowElement) rowElement.classList.add("selected");

  $("drawerTitle").textContent = `${log.method} ${log.responseStatus} (${log.duration}ms) ${log.simulated ? "[SIMULATED]" : ""}`;
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

// Listen for live traffic relayed by content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "NEW_TRAFFIC_LOG") {
    trafficLogs.unshift({ id: Date.now(), ...msg.log });
    if (trafficLogs.length > 100) trafficLogs.pop();
    renderTrafficTable();
  }
});

/* ── HEVC Extractor & Decoder Logic ─────────────────── */
async function checkGlobalWebCodecs() {
  const statusEl = $("hevcWebCodecsStatus");
  if (!statusEl) return;
  if (typeof VideoDecoder === "undefined") {
    statusEl.textContent = "WebCodecs: Unsupported";
    statusEl.className = "mode-badge";
    return;
  }
  try {
    const res = await VideoDecoder.isConfigSupported({ codec: "hvc1.1.6.L93.B0" });
    if (res.supported) {
      statusEl.textContent = "WebCodecs: HEVC Supported";
      statusEl.className = "mode-badge test";
    } else {
      statusEl.textContent = "WebCodecs: HEVC Unsupported by GPU/OS";
      statusEl.className = "mode-badge";
    }
  } catch (err) {
    statusEl.textContent = "WebCodecs Error";
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

      // Render metadata
      $("hevcMetadataCard").style.display = "block";
      $("hevcCodecBadge").textContent = meta.codec.toUpperCase();
      $("metaRes").textContent = `${meta.width} × ${meta.height}`;
      $("metaProfile").textContent = `${meta.profile} (${meta.tier})`;
      $("metaLevel").textContent = meta.level;
      $("metaCodecStr").textContent = meta.codecString;
      $("metaDuration").textContent = `${meta.duration}s`;

      logAuditEvent("HEVC_INSPECTED", `Inspected ${file.name}: ${meta.codecString} (${meta.width}x${meta.height})`);

      // Initialize WebDecoder
      const canvas = $("hevcCanvas");
      activeWebDecoder = new window.HEVCWebDecoder(canvas);
      const support = await activeWebDecoder.checkCodecSupport(meta.codecString);

      if (support.supported) {
        $("hevcWebCodecsStatus").textContent = "Decoder Ready";
        $("hevcWebCodecsStatus").className = "mode-badge test";
        $("canvasPreviewBox").style.display = "block";
      } else {
        $("hevcWebCodecsStatus").textContent = "Decoder: " + support.reason;
        $("hevcWebCodecsStatus").className = "mode-badge";
      }
    } catch (err) {
      alert("HEVC Inspection Failed: " + err.message);
      logAuditEvent("HEVC_ERROR", err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};

$("exportFrameBtn").onclick = () => {
  if (!activeWebDecoder) return;
  const dataUrl = activeWebDecoder.exportCurrentFramePNG();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `hevc-frame-${Date.now()}.png`;
  a.click();
  logAuditEvent("FRAME_EXPORTED", "Exported canvas frame as PNG.");
};

/* ── Queue Management ───────────────────────────────── */
function renderQueue() {
  const list = $("list");
  list.innerHTML = "";
  const nextIndex = queueItems.findIndex((i) => !i.done);

  queueItems.forEach((item, idx) => {
    const li = document.createElement("li");
    if (item.done) li.className = "done";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = item.done;
    box.onchange = () => {
      item.done = box.checked;
      saveQueue();
      renderQueue();
    };

    const text = document.createElement("span");
    text.className = "prompt-text";
    text.textContent = item.text;

    const del = document.createElement("button");
    del.className = "remove-btn";
    del.textContent = "✕";
    del.onclick = () => {
      queueItems.splice(idx, 1);
      saveQueue();
      renderQueue();
    };

    li.append(box, text, del);
    list.appendChild(li);
  });

  const doneCount = queueItems.filter((i) => i.done).length;
  $("progress").textContent = `${doneCount} of ${queueItems.length} done`;
  $("insert").disabled = nextIndex === -1;
}

async function saveQueue() {
  await chrome.storage.local.set({ harness_queue: queueItems });
}

$("add").onclick = () => {
  const raw = $("bulk").value.trim();
  if (!raw) return;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  lines.forEach((t) => queueItems.push({ text: t, done: false }));
  $("bulk").value = "";
  saveQueue();
  renderQueue();
};

$("insert").onclick = async () => {
  const next = queueItems.find((i) => !i.done);
  if (!next) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "insert", text: next.text });
    if (res && res.ok) {
      next.done = true;
      saveQueue();
      renderQueue();
      say("Prompt injected into test target.");
      logAuditEvent("PROMPT_INJECTED", next.text);
    } else {
      say(res?.error || "Injection failed", true);
    }
  } catch (err) {
    say(err.message || "Failed to inject into page", true);
  }
};

$("copy").onclick = async () => {
  const next = queueItems.find((i) => !i.done);
  if (!next) return;
  await navigator.clipboard.writeText(next.text);
  say("Copied prompt to clipboard.");
};

$("reset").onclick = () => {
  queueItems.forEach((i) => (i.done = false));
  saveQueue();
  renderQueue();
};
$("clear").onclick = () => {
  queueItems = [];
  saveQueue();
  renderQueue();
};

function say(text, isErr = false) {
  const el = $("msg");
  el.textContent = text;
  el.className = isErr ? "err" : "";
}

/* ── Audit Log & JSON Export ────────────────────────── */
let auditEvents = [];

function logAuditEvent(type, detail) {
  const eventObj = {
    timestamp: new Date().toISOString(),
    type,
    detail,
  };
  auditEvents.unshift(eventObj);
  if (auditEvents.length > 50) auditEvents.pop();
  renderAuditLogs();
}

function renderAuditLogs() {
  const list = $("auditLogList");
  const empty = $("emptyAudit");
  if (!list) return;

  list.innerHTML = "";
  if (auditEvents.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  auditEvents.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const typeSpan = document.createElement("strong");
    typeSpan.textContent = ev.type;

    const timeSpan = document.createElement("span");
    timeSpan.style.color = "var(--muted)";
    timeSpan.textContent = new Date(ev.timestamp).toLocaleTimeString();

    top.append(typeSpan, timeSpan);

    const desc = document.createElement("div");
    desc.style.fontSize = "11px";
    desc.textContent = ev.detail;

    li.append(top, desc);
    list.appendChild(li);
  });
}

$("exportAuditJson").onclick = () => {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    config: harnessConfig,
    auditEvents,
    interceptedTraffic: trafficLogs,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `security-audit-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Initialize
init();
