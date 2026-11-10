// Server-authoritative MP4 duration reader (features.md Phase 12A.2 — "SERVER-
// AUTHORITATIVE duration check: on upload, read duration"). Deliberately not
// a wrapper around ffprobe/ffmpeg (no such binary is guaranteed present on any
// deploy target this codebase runs on — Docker/Railway/local dev all vary) and
// not a wrapper around Puppeteer/browser APIs (server-side, no DOM/<video>
// element exists). This is a real, from-spec ISO-BMFF (MP4 container format)
// box parser: it walks top-level boxes to find `moov`, walks moov's direct
// children to find `mvhd` (Movie Header Box), and reads that box's own
// `timescale`/`duration` fields — the same two numbers any MP4 tool derives
// duration from, per the ISO/IEC 14496-12 spec's own field layout.

interface Box {
  type: string;
  start: number;
  end: number;
  headerSize: number;
}

export class InvalidMp4Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMp4Error";
  }
}

function readBoxes(buffer: Buffer, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    let headerSize = 8;

    if (size === 1) {
      if (offset + 16 > end) throw new InvalidMp4Error(`Truncated 64-bit box size for "${type}"`);
      const high = buffer.readUInt32BE(offset + 8);
      const low = buffer.readUInt32BE(offset + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset; // box extends to the end of its parent
    }

    if (size < headerSize || offset + size > end) {
      throw new InvalidMp4Error(`Malformed box "${type}" at offset ${offset}: size ${size} out of bounds`);
    }

    boxes.push({ type, start: offset, end: offset + size, headerSize });
    offset += size;
  }
  return boxes;
}

/**
 * Returns an MP4 file's duration in whole seconds, read from its `moov/mvhd`
 * box. Throws InvalidMp4Error for anything that isn't a well-formed MP4 with
 * the boxes this needs — callers (services/verificationRecording.ts) treat
 * that the same as any other upload-validation failure, not a 500.
 */
export function getMp4DurationSeconds(buffer: Buffer): number {
  const topBoxes = readBoxes(buffer, 0, buffer.length);
  const moov = topBoxes.find((b) => b.type === "moov");
  if (!moov) throw new InvalidMp4Error("No moov box found — not a valid MP4 file");

  const moovChildren = readBoxes(buffer, moov.start + moov.headerSize, moov.end);
  const mvhd = moovChildren.find((b) => b.type === "mvhd");
  if (!mvhd) throw new InvalidMp4Error("No mvhd box found inside moov — not a valid MP4 file");

  const bodyStart = mvhd.start + mvhd.headerSize;
  if (bodyStart + 4 > mvhd.end) throw new InvalidMp4Error("mvhd box is too short to contain a version/flags header");
  const version = buffer.readUInt8(bodyStart);

  let timescale: number;
  let duration: number;
  if (version === 1) {
    const need = bodyStart + 4 + 8 + 8 + 4 + 8;
    if (need > mvhd.end) throw new InvalidMp4Error("mvhd (v1) box is too short for timescale/duration fields");
    timescale = buffer.readUInt32BE(bodyStart + 4 + 8 + 8);
    const durHigh = buffer.readUInt32BE(bodyStart + 4 + 8 + 8 + 4);
    const durLow = buffer.readUInt32BE(bodyStart + 4 + 8 + 8 + 4 + 4);
    duration = durHigh * 2 ** 32 + durLow;
  } else {
    const need = bodyStart + 4 + 4 + 4 + 4 + 4;
    if (need > mvhd.end) throw new InvalidMp4Error("mvhd (v0) box is too short for timescale/duration fields");
    timescale = buffer.readUInt32BE(bodyStart + 4 + 4 + 4);
    duration = buffer.readUInt32BE(bodyStart + 4 + 4 + 4 + 4);
  }

  if (timescale === 0) throw new InvalidMp4Error("mvhd timescale is zero — cannot compute a duration");
  return duration / timescale;
}
