# Dola AI Pro — 30s HD Video Generator & High Demand Fix (ShamodPro v3)

An advanced browser extension engineered for **Dola AI** (`dola.com`, `trydola.com`, `dola.ai`) and **Doubao** (`doubao.com`), implementing the complete feature set from Shamod Firezz's 30-Second AI Video tutorial and issue fixes.

---

## ⚡ Core Capabilities

### 1. 30-Second Duration Force Engine
- By default, Dola AI web interfaces restrict generation duration to 5s–15s.
- This extension intercepts all outgoing network requests (`fetch` and `XMLHttpRequest`) in the page's main execution realm at `document_start`.
- It dynamically inspects request payloads and query parameters, mutating `duration`, `video_duration`, `seconds`, and `length` to **`30`**.
- Ensures generations request full 30-second continuous render cycles.

### 2. Strict 1080p Resolution & Definition Engine
- **Why 720p occurs**: By default, Dola AI falls back to standard definition (720p or 480p) unless explicitly instructed in the payload. Furthermore, older Seedance 2.0 models are server-side capped at 720p and 15 seconds.
- **The 1080p Override**: The extension enforces `resolution: "1080p"`, `definition: "1080p"`, `quality: "1080p"`, `video_resolution: "1080p"`, and dimension overrides (`1920x1080` for landscape, `1080x1920` for portrait) on all outgoing JSON, FormData, and URLSearchParams payloads.
- **Model Upgrade to Seedance 2.5**: The extension automatically upgrades model identifiers (e.g. `seedance-2.0` -> `doubao-seedance-2-5` / `seedance-2.5`). Only Seedance 2.5 supports single-pass 30-second clips at full 1080p high definition!
- **DOM UI Auto-Selector**: Automatically detects and activates "1080p" / "HD" buttons in the Dola AI user interface.

### 3. High Demand Error Auto-Fix (`Dola Issue Fix`)
- High server load on Dola/Doubao often triggers HTTP 429, 503, or `"High Demand / Server Busy"` errors.
- The built-in auto-retry engine detects these error signatures.
- Automatically re-submits the request with an exponential backoff jitter schedule (up to 5 attempts) so generations proceed without manual clicking.
- Shows real-time toast notifications on page during retry attempts.

### 4. Clean MP4 & Watermark Stripper
- Sets `watermark: false` and `no_watermark: true` on request parameters.
- Intercepts incoming video streams from ByteDance/Volcengine CDNs (`tos-`, `volces.com`, `byteimg.com`).
- Displays a floating on-page widget: **"🎬 Clean 30s Video Ready | ⬇️ Download Clean MP4"**.
- Saves captured media links in the extension popup for 1-click batch downloading.

### 4. 30-Second Cinematic Prompt Engine (`SKILL.md`)
- Integrated with the 3-Beat narrative progression formula:
  - **Beat 1 (0–8s Establish)**: Camera optics, lighting, atmosphere, subject posture.
  - **Beat 2 (8–22s Core Action)**: Paced physical action, slow tracking camera push-in.
  - **Beat 3 (22–30s Cinematic Resolve)**: Camera pull-back, atmospheric resolution.
- One-click prompt injector into Dola AI's chat/input box.
- Built-in cinematic presets: Hollywood 35mm Anamorphic, Steadicam Golden Hour, Macro Probe Sizzle, Cyberpunk Orbit, Epic Misty Mountain.

### 5. HEVC / H.265 Extractor & WebCodecs Decoder (`hevc-decoder.js`)
- Parses ISO-BMFF box structures (`moov`, `trak`, `hvcC`).
- Hardware/Software decoding via the browser WebCodecs API.
- Direct frame snapshot export to PNG.

---

## 🛠️ Installation & Setup (Chrome / Edge / Brave)

1. Open your browser and navigate to:
   ```
   chrome://extensions/
   ```
2. Enable **Developer mode** using the toggle in the top-right corner.
3. If an earlier version of this extension was loaded, click the **Reload (↻)** icon or remove it.
4. Click **"Load unpacked"** and select this directory:
   ```
   d:\Projects\Dola_Extension\dola_extension
   ```
5. Pin **Dola AI Pro** (⚡) to your browser extensions bar.

---

## 💡 Troubleshooting: "Could not inject" Notice

If you ever see the message:
> *"Could not inject: Ensure you are on dola.com or trydola.com"* or *"Please refresh your Dola AI tab"*

### Why this happens:
1. **The active browser tab is not on Dola AI**: The extension popup was clicked while on an unsupported page (like `chrome://extensions/`, `chrome://newtab`, or a settings tab).
   - **Fix**: Switch to your open [dola.com](https://www.dola.com) or [trydola.com](https://www.trydola.com) tab first before clicking the extension popup.
2. **Page was opened before reloading the extension**: When you reload an unpacked extension in Chrome, already-opened tabs lose their connection to the old content script until refreshed.
   - **Fix**: Simply press **F5 (Refresh)** on your Dola AI page once after loading the extension. The extension will now also automatically inject on demand.
3. **Click into the prompt input box**: Make sure to click once into Dola's prompt input box so the extension knows which input to insert the prompt into.

---

## 🧪 Local Test Target Verification

You can verify the extension locally before opening Dola AI:

1. In the project folder, start a local server:
   ```bash
   python -m http.server 8080
   ```
2. In Chrome, open:
   ```
   http://localhost:8080/mock-server/test-target.html
   ```
3. Open the **Dola AI Pro** extension popup:
   - Confirm **30s Video Mode** and **High Demand Fix** toggles are ON.
   - Go to the **30s Prompts** tab and click **"⚡ Insert into Dola AI"**.
   - Notice the prompt instantly populates the input field on the page!
   - Click **"Submit Generation Request (Test 30s Override)"** on the test page.
   - Switch to the popup's **Traffic** tab: verify the entry shows status `200` with the `30s` badge, proving the duration payload was modified to 30 seconds!
