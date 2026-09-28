/**
 * hevc-decoder.js — HEVC (H.265) Stream Inspector & WebCodecs Frame Decoder
 * Parses ISO Base Media File Format (MP4) boxes, extracts HEVC (hvc1/hev1) tracks,
 * parses codec parameters, and decodes frames using the browser WebCodecs API.
 */

class HEVCInspector {
  constructor(arrayBuffer) {
    this.buffer = arrayBuffer;
    this.view = new DataView(arrayBuffer);
    this.metadata = null;
  }

  // Parse ISO BMFF top-level and nested boxes
  inspect() {
    let offset = 0;
    const len = this.buffer.byteLength;
    let moovBox = null;

    while (offset < len - 8) {
      const size = this.view.getUint32(offset);
      const type = this.getString(offset + 4, 4);
      const boxSize = size === 1 ? Number(this.view.getBigUint64(offset + 8)) : (size === 0 ? len - offset : size);

      if (type === "moov") {
        moovBox = { offset, size: boxSize };
        break;
      }
      offset += boxSize;
    }

    if (!moovBox) {
      throw new Error("Invalid MP4 file: 'moov' atom not found. Ensure file is finalized.");
    }

    const videoTrack = this.findVideoTrack(moovBox.offset + 8, moovBox.offset + moovBox.size);
    if (!videoTrack) {
      throw new Error("No video track found in MP4 container.");
    }

    this.metadata = videoTrack;
    return this.metadata;
  }

  findVideoTrack(startOffset, endOffset) {
    let offset = startOffset;
    while (offset < endOffset - 8) {
      const size = this.view.getUint32(offset);
      const type = this.getString(offset + 4, 4);
      const boxEnd = offset + size;

      if (type === "trak") {
        const trackInfo = this.parseTrack(offset + 8, boxEnd);
        if (trackInfo && trackInfo.isVideo) {
          return trackInfo;
        }
      }
      offset = boxEnd;
    }
    return null;
  }

  parseTrack(startOffset, endOffset) {
    let offset = startOffset;
    let isVideo = false;
    let codec = "unknown";
    let width = 0;
    let height = 0;
    let durationSec = 0;
    let timescale = 1000;
    let hvcCData = null;

    while (offset < endOffset - 8) {
      const size = this.view.getUint32(offset);
      const type = this.getString(offset + 4, 4);
      const boxEnd = offset + size;

      if (type === "mdia") {
        let mdiaOffset = offset + 8;
        while (mdiaOffset < boxEnd - 8) {
          const mSize = this.view.getUint32(mdiaOffset);
          const mType = this.getString(mdiaOffset + 4, 4);
          const mEnd = mdiaOffset + mSize;

          if (mType === "mdhd") {
            const version = this.view.getUint8(mdiaOffset + 8);
            timescale = version === 1 ? this.view.getUint32(mdiaOffset + 28) : this.view.getUint32(mdiaOffset + 20);
            const rawDur = version === 1 ? Number(this.view.getBigUint64(mdiaOffset + 32)) : this.view.getUint32(mdiaOffset + 24);
            durationSec = timescale > 0 ? (rawDur / timescale).toFixed(2) : 0;
          } else if (mType === "minf") {
            let minfOffset = mdiaOffset + 8;
            while (minfOffset < mEnd - 8) {
              const miSize = this.view.getUint32(minfOffset);
              const miType = this.getString(minfOffset + 4, 4);
              const miEnd = minfOffset + miSize;

              if (miType === "stbl") {
                let stblOffset = minfOffset + 8;
                while (stblOffset < miEnd - 8) {
                  const sSize = this.view.getUint32(stblOffset);
                  const sType = this.getString(stblOffset + 4, 4);
                  const sEnd = stblOffset + sSize;

                  if (sType === "stsd") {
                    // Sample Description
                    const entryCount = this.view.getUint32(stblOffset + 12);
                    let entryOffset = stblOffset + 16;
                    for (let i = 0; i < entryCount; i++) {
                      const eSize = this.view.getUint32(entryOffset);
                      const format = this.getString(entryOffset + 4, 4);
                      codec = format;

                      if (format === "hvc1" || format === "hev1" || format === "avc1" || format === "vp09") {
                        isVideo = true;
                        width = this.view.getUint16(entryOffset + 32);
                        height = this.view.getUint16(entryOffset + 34);

                        if (format === "hvc1" || format === "hev1") {
                          hvcCData = this.parseHvcC(entryOffset + 86, entryOffset + eSize);
                        }
                      }
                      entryOffset += eSize;
                    }
                  }
                  stblOffset = sEnd;
                }
              }
              minfOffset = miEnd;
            }
          }
          mdiaOffset = mEnd;
        }
      }
      offset = boxEnd;
    }

    if (!isVideo) return null;

    const isHEVC = codec === "hvc1" || codec === "hev1";
    return {
      isVideo: true,
      codec,
      isHEVC,
      width,
      height,
      duration: Number(durationSec),
      timescale,
      profile: hvcCData ? hvcCData.profile : "Main",
      tier: hvcCData ? hvcCData.tier : "Main",
      level: hvcCData ? hvcCData.level : "3.1",
      codecString: hvcCData ? hvcCData.codecString : (isHEVC ? "hvc1.1.6.L93.B0" : codec),
      rawHvcC: hvcCData,
    };
  }

  parseHvcC(startOffset, endOffset) {
    let offset = startOffset;
    while (offset < endOffset - 8) {
      const size = this.view.getUint32(offset);
      const type = this.getString(offset + 4, 4);
      if (type === "hvcC") {
        const generalProfileSpace = (this.view.getUint8(offset + 9) >> 6) & 0x03;
        const generalTierFlag = (this.view.getUint8(offset + 9) >> 5) & 0x01;
        const generalProfileIdc = this.view.getUint8(offset + 9) & 0x1f;
        const generalProfileCompatFlags = this.view.getUint32(offset + 10);
        const generalLevelIdc = this.view.getUint8(offset + 20);

        const profileName = generalProfileIdc === 1 ? "Main" : generalProfileIdc === 2 ? "Main 10" : `Profile ${generalProfileIdc}`;
        const tierName = generalTierFlag === 0 ? "Main Tier" : "High Tier";
        const levelNum = (generalLevelIdc / 30).toFixed(1);

        const profileSpaceHex = generalProfileSpace === 0 ? "" : String.fromCharCode(64 + generalProfileSpace);
        const compatHex = generalProfileCompatFlags.toString(16).toUpperCase();
        const codecString = `hvc1.${profileSpaceHex}${generalProfileIdc}.${compatHex}.${generalTierFlag ? "H" : "L"}${generalLevelIdc}.B0`;

        return {
          profile: profileName,
          tier: tierName,
          level: levelNum,
          profileIdc: generalProfileIdc,
          levelIdc: generalLevelIdc,
          codecString,
        };
      }
      offset += size;
    }
    return null;
  }

  getString(offset, length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.view.getUint8(offset + i));
    }
    return str;
  }
}

/**
 * WebCodecs Frame Decoder
 */
class HEVCWebDecoder {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.decoder = null;
    this.decodedFrames = [];
    this.isSupported = typeof VideoDecoder !== "undefined";
  }

  async checkCodecSupport(codecString) {
    if (!this.isSupported) {
      return { supported: false, reason: "WebCodecs API is not supported in this browser." };
    }
    try {
      const config = {
        codec: codecString || "hvc1.1.6.L93.B0",
        optimizeForLatency: true,
      };
      const res = await VideoDecoder.isConfigSupported(config);
      return {
        supported: res.supported,
        config: res.config,
        reason: res.supported ? "Hardware/Software decoding available." : "Browser does not have an HEVC decoder installed or enabled.",
      };
    } catch (err) {
      return { supported: false, reason: err.message };
    }
  }

  renderVideoFrame(videoFrame) {
    this.canvas.width = videoFrame.displayWidth;
    this.canvas.height = videoFrame.displayHeight;
    this.ctx.drawImage(videoFrame, 0, 0);

    // Save frame metadata
    this.decodedFrames.push({
      timestamp: videoFrame.timestamp,
      width: videoFrame.displayWidth,
      height: videoFrame.displayHeight,
    });

    videoFrame.close();
  }

  exportCurrentFramePNG() {
    return this.canvas.toDataURL("image/png");
  }
}

// Export for usage in popup / background
window.HEVCInspector = HEVCInspector;
window.HEVCWebDecoder = HEVCWebDecoder;
