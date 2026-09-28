# Authorized Security-Testing Harness & HEVC Decoder

A developer and security auditing extension engineered for **locally controlled test targets** (`http://localhost:*`, `http://127.0.0.1:*`).

---

## Capabilities

### 1. In-Page Network Interceptor (`inpage-interceptor.js`)
- Injected into the page's main world execution environment on allowlisted origins.
- Intercepts both `window.fetch()` and `window.XMLHttpRequest`.
- Captures:
  - Request Method, URL, and Headers
  - Request Payload (JSON or text)
  - Response Status Code & Duration (ms)
  - Response Body Payload
- Three Operating Modes:
  - **Observe Mode**: Passive, read-only monitoring without altering requests.
  - **Modify Mode**: Applies active test simulation scenarios (e.g., zero credits, 402 rejection, malformed syntax).
  - **Disabled Mode**: Completely unhooks, allowing native browser execution.

### 2. Mock Credit-Limit & Resilience Testing
- **Zero Credits Balance**: Simulates an exhausted credit balance (`credits: 0`).
- **Expired Credits**: Simulates an expired plan or token (`403 Forbidden`).
- **Server Rejection (HTTP 402)**: Simulates quota enforcement rejection on generation dispatch.
- **Malformed Syntax**: Simulates corrupted JSON payloads to test client error boundary recovery.
- **Simulated Unlimited Tier**: Returns mock high-capacity credits for local UI flow validation.

### 3. HEVC / H.265 Extractor & Decoder (`hevc-decoder.js`)
- Parses MP4 ISO-BMFF box structures (`moov`, `trak`, `mdia`, `minf`, `stbl`, `stsd`, `hvcC`).
- Extracts metadata:
  - Codec Identifier (`hvc1` / `hev1`)
  - Profile & Tier (Main, Main 10, High Tier)
  - Level calculation (e.g., Level 3.1, Level 5.1)
  - Dimensions (`width` × `height`)
  - Formatted WebCodecs MIME string (`hvc1.1.6.L93.B0`)
- **WebCodecs API Hardware/Software Decoding**:
  - Tests browser/GPU capability via `VideoDecoder.isConfigSupported()`.
  - Decodes frames directly onto an HTML `<canvas>`.
  - Exports decoded frames as PNG files.
  - Reports unsupported platforms explicitly without silent failure.

### 4. Safety Controls
- **Domain Allowlist**: Scoped exclusively to `localhost` and `127.0.0.1`.
- **Master Kill Switch**: Instantly disables interception.
- **No Credential Harvesting**: Does not log or store authentication cookies or bearer tokens.
- **No DRM Circumvention**: Operates strictly on unencrypted video containers.

---

## Installation & Setup

1. Open Chrome/Edge and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **"Load unpacked"** and select this directory (`hello_dora`).
4. The **🛡️ Security Harness** icon will appear in your extensions bar.

---

## Local Verification Test Steps

### 1. Launch the Mock Test Target
Start a local HTTP server in the project directory using Node or Python:
```bash
# Using Python
python -m http.server 8080

# Or using Node http-server
npx http-server -p 8080
```
Navigate to:
```
http://localhost:8080/mock-server/test-target.html
```

### 2. Test Traffic Observation (Observe Mode)
1. Open the **Security Harness** extension popup.
2. Confirm the top status badge reads `OBSERVE MODE`.
3. In the web app, click **"Check Credits (Fetch)"**.
4. In the popup's **Traffic** tab, observe the recorded entry:
   - Status: `200`
   - Method: `GET`
   - URL: `/api/user/credits`
5. Click the row to open the payload inspector and inspect request and response headers and body.

### 3. Test Mock Limit Scenarios (Modify Mode)
1. In the popup, switch to the **Simulate** tab.
2. Select **"Server Rejection (HTTP 402)"** or **"Zero Credits Balance"**.
3. In the web app, click **"Submit Generation Request"**.
4. Observe the mock application react to the simulated status code (`402 Payment Required`).
5. Open the **Audit Log** tab and click **"Export JSON"** to download the comprehensive test session report.

### 4. Test HEVC Video Extraction & Decoding
1. In the popup, click the **HEVC Decode** tab.
2. Click **"Choose Test MP4 Video..."** and select an HEVC/H.265 encoded MP4 file.
3. Verify that the metadata card populates with the codec (`HVC1`), profile, level, dimensions, and duration.
4. Click **"Export Frame PNG"** to download a decoded video frame snapshot.
