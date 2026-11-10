import { describe, it, expect } from "vitest";
import { getMp4DurationSeconds, InvalidMp4Error } from "./videoDuration.js";

// Builds real, spec-shaped (ISO/IEC 14496-12) MP4 boxes byte-for-byte — not a
// fixture file checked into the repo, so the test documents exactly which
// bytes at which offsets the parser is expected to read.

function box(type: string, body: Buffer): Buffer {
  const size = 8 + body.length;
  const header = Buffer.alloc(8);
  header.writeUInt32BE(size, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, body]);
}

function mvhdV0(timescale: number, duration: number): Buffer {
  const body = Buffer.alloc(1 + 3 + 4 + 4 + 4 + 4);
  body.writeUInt8(0, 0); // version
  // flags (3 bytes) left zero
  body.writeUInt32BE(0, 4); // creation_time
  body.writeUInt32BE(0, 8); // modification_time
  body.writeUInt32BE(timescale, 12);
  body.writeUInt32BE(duration, 16);
  return box("mvhd", body);
}

function mvhdV1(timescale: number, duration: bigint): Buffer {
  const body = Buffer.alloc(1 + 3 + 8 + 8 + 4 + 8);
  body.writeUInt8(1, 0); // version
  body.writeBigUInt64BE(0n, 4); // creation_time
  body.writeBigUInt64BE(0n, 12); // modification_time
  body.writeUInt32BE(timescale, 20);
  body.writeBigUInt64BE(duration, 24);
  return box("mvhd", body);
}

function mp4WithMvhd(mvhd: Buffer): Buffer {
  const ftyp = box("ftyp", Buffer.from("isommp42", "ascii"));
  const moov = box("moov", mvhd);
  return Buffer.concat([ftyp, moov]);
}

describe("getMp4DurationSeconds (features.md Phase 12A.2 — server-authoritative duration check)", () => {
  it("reads a version-0 mvhd box correctly (timescale 1000, duration 45000 -> 45s)", () => {
    const mp4 = mp4WithMvhd(mvhdV0(1000, 45_000));
    expect(getMp4DurationSeconds(mp4)).toBe(45);
  });

  it("reads a version-1 (64-bit) mvhd box correctly", () => {
    const mp4 = mp4WithMvhd(mvhdV1(1000, 90_000n));
    expect(getMp4DurationSeconds(mp4)).toBe(90);
  });

  it("handles a non-integer-second duration (fractional seconds preserved)", () => {
    const mp4 = mp4WithMvhd(mvhdV0(1000, 91_500)); // 91.5s — just over the 90s cap
    expect(getMp4DurationSeconds(mp4)).toBeCloseTo(91.5);
  });

  it("throws InvalidMp4Error when there's no moov box at all", () => {
    const notAnMp4 = box("ftyp", Buffer.from("isom", "ascii"));
    expect(() => getMp4DurationSeconds(notAnMp4)).toThrow(InvalidMp4Error);
  });

  it("throws InvalidMp4Error when moov has no mvhd child", () => {
    const moovWithoutMvhd = box("moov", box("trak", Buffer.alloc(4)));
    expect(() => getMp4DurationSeconds(moovWithoutMvhd)).toThrow(InvalidMp4Error);
  });

  it("throws InvalidMp4Error on a truncated/malformed box (declared size exceeds buffer)", () => {
    const truncated = Buffer.alloc(8);
    truncated.writeUInt32BE(9999, 0); // claims a size far larger than the buffer
    truncated.write("moov", 4, "ascii");
    expect(() => getMp4DurationSeconds(truncated)).toThrow(InvalidMp4Error);
  });

  it("throws InvalidMp4Error on a completely non-MP4 buffer (e.g. a PDF)", () => {
    expect(() => getMp4DurationSeconds(Buffer.from("%PDF-1.4\nnot a video"))).toThrow(InvalidMp4Error);
  });

  it("throws InvalidMp4Error when timescale is zero", () => {
    const mp4 = mp4WithMvhd(mvhdV0(0, 45_000));
    expect(() => getMp4DurationSeconds(mp4)).toThrow(InvalidMp4Error);
  });
});
