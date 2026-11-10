import { describe, it, expect, vi, beforeEach } from "vitest";
import { inflateSync } from "node:zlib";

vi.mock("../db/client.js", () => ({
  prisma: {
    mediaKit: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    creator: { findUniqueOrThrow: vi.fn() },
    rateCard: { findMany: vi.fn() },
  },
}));

vi.mock("../lib/mediaKitStorage.js", () => ({
  writeMediaKitFile: vi.fn(),
  readMediaKitFile: vi.fn(),
  deleteMediaKitFile: vi.fn(),
}));

vi.mock("../providers/index.js", () => ({
  scannerProvider: { scan: vi.fn() },
}));

import { prisma } from "../db/client.js";
import { writeMediaKitFile, readMediaKitFile } from "../lib/mediaKitStorage.js";
import { scannerProvider } from "../providers/index.js";
import {
  renderMediaKitPdf,
  isPdfMagicBytes,
  regenerateMediaKit,
  applyMediaKitUpload,
  revertMediaKitToAuto,
  getPublicMediaKitFile,
  MediaKitUploadTooLargeError,
  MediaKitNotAPdfError,
  MediaKitInfectedError,
  MediaKitFileMissingError,
  MAX_UPLOAD_BYTES,
  type MediaKitCreatorInput,
} from "./mediaKit.js";

const prismaMock = prisma as any;
const writeMediaKitFileMock = writeMediaKitFile as any;
const readMediaKitFileMock = readMediaKitFile as any;
const scannerMock = scannerProvider as any;

function fakeCreator(overrides: Partial<MediaKitCreatorInput & { referralCode: string; userId: string }> = {}): MediaKitCreatorInput {
  return {
    id: "creator-1",
    name: "Ada Lovelace",
    niche: "VO_ARTIST",
    location: "Lagos",
    bio: "A talented voice artist.",
    styleTags: ["Warm", "Multilingual"],
    verification: "VERIFIED",
    celebrityBadge: false,
    ...overrides,
  };
}

/** pdf-lib FlateDecode-compresses content streams by default AND hex-encodes
 * every drawn glyph string as `<...> Tj` (verified by inspecting real output —
 * it never emits literal `(text) Tj`), so neither raw bytes nor a naive
 * decompress is a plain substring of what was actually drawn. This decompresses
 * every `stream ... endstream` block, then hex-decodes every `<HEX> Tj`
 * operand back to text (WinAnsi is ASCII-equivalent for the plain Latin text
 * this renderer draws), so assertions test the real rendered content. */
function decompressPdfText(bytes: Buffer): string {
  const text = bytes.toString("latin1");
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(text))) {
    const raw = Buffer.from(match[1], "latin1");
    let decompressed: string;
    try {
      decompressed = inflateSync(raw).toString("latin1");
    } catch {
      decompressed = raw.toString("latin1"); // not a compressed stream (e.g. xref) — use as-is
    }
    const hexStringRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexStringRe.exec(decompressed))) {
      chunks.push(Buffer.from(hexMatch[1], "hex").toString("latin1"));
    }
  }
  return chunks.join(" ");
}

const REAL_PDF_HEADER = Buffer.from("%PDF-1.4\n%mock pdf content for tests\n", "utf8");
const EICAR = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*", "utf8");

describe("Media Kit service (features.md Phase 12A.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renderMediaKitPdf — auto-generated from PUBLIC data only", () => {
    it("produces a real PDF (magic bytes present)", async () => {
      const bytes = await renderMediaKitPdf(fakeCreator(), []);
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("contains only public profile data — never a private field like referralCode or userId", async () => {
      const creator = fakeCreator({ referralCode: "REF-SECRET-1234", userId: "user-super-secret-id" });
      const bytes = await renderMediaKitPdf(creator, [
        { serviceTitle: "VO Session", basePriceAmount: 2_800_000, basePriceCurrency: "NGN", deliveryTimeline: "Same Day" },
      ]);
      const text = decompressPdfText(bytes);
      expect(text).not.toContain("REF-SECRET-1234");
      expect(text).not.toContain("user-super-secret-id");
      // Public fields ARE present.
      expect(text).toContain("Ada Lovelace");
    });

    it("renders NGN pricing without crashing on the currency symbol (pdf-lib's WinAnsi encoding can't encode ₦)", async () => {
      await expect(
        renderMediaKitPdf(fakeCreator(), [
          { serviceTitle: "VO Session", basePriceAmount: 2_800_000, basePriceCurrency: "NGN", deliveryTimeline: "Same Day" },
        ]),
      ).resolves.toBeInstanceOf(Buffer);
    });

    it("shows 'on request' when the creator has no rate cards", async () => {
      const bytes = await renderMediaKitPdf(fakeCreator(), []);
      expect(decompressPdfText(bytes)).toContain("on request");
    });
  });

  describe("regenerateMediaKit — bumps autoVersion and busts cache", () => {
    it("increments autoVersion and sets autoLastRenderedAt", async () => {
      prismaMock.rateCard.findMany.mockResolvedValue([]);
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", autoVersion: 2, mode: "AUTO" });

      const result = await regenerateMediaKit(fakeCreator());

      expect(writeMediaKitFileMock).toHaveBeenCalledWith("creator-1", "auto", expect.any(Buffer));
      expect(prismaMock.mediaKit.update).toHaveBeenCalledWith({
        where: { creatorId: "creator-1" },
        data: { autoVersion: { increment: 1 }, autoLastRenderedAt: expect.any(Date) },
      });
      expect(result.autoVersion).toBe(2);
    });
  });

  describe("applyMediaKitUpload — magic bytes, size cap, virus scan", () => {
    it("rejects a .pdf-named file that isn't really a PDF (fails magic-byte check)", async () => {
      const fakePdf = Buffer.from("this is just a text file pretending to be a pdf", "utf8");
      await expect(applyMediaKitUpload("creator-1", fakePdf)).rejects.toThrow(MediaKitNotAPdfError);
      expect(scannerMock.scan).not.toHaveBeenCalled();
      expect(writeMediaKitFileMock).not.toHaveBeenCalled();
    });

    it("rejects a file over the 20MB cap even if it has real PDF magic bytes", async () => {
      const oversized = Buffer.concat([REAL_PDF_HEADER, Buffer.alloc(MAX_UPLOAD_BYTES)]);
      await expect(applyMediaKitUpload("creator-1", oversized)).rejects.toThrow(MediaKitUploadTooLargeError);
      expect(scannerMock.scan).not.toHaveBeenCalled();
    });

    it("passes a clean file through the scanner and stores it", async () => {
      scannerMock.scan.mockResolvedValue("CLEAN");
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", mode: "UPLOAD" });

      const result = await applyMediaKitUpload("creator-1", REAL_PDF_HEADER);

      expect(scannerMock.scan).toHaveBeenCalledWith(REAL_PDF_HEADER);
      expect(writeMediaKitFileMock).toHaveBeenCalledWith("creator-1", "upload", REAL_PDF_HEADER);
      expect(prismaMock.mediaKit.update).toHaveBeenCalledWith({
        where: { creatorId: "creator-1" },
        data: { mode: "UPLOAD", uploadUrl: expect.stringContaining("creator-1"), uploadSizeBytes: REAL_PDF_HEADER.length },
      });
      expect(result.mode).toBe("UPLOAD");
    });

    it("rejects a file the scanner flags as infected — never stored, mode never flips", async () => {
      const dirtyPdf = Buffer.concat([REAL_PDF_HEADER, EICAR]);
      scannerMock.scan.mockResolvedValue("INFECTED");

      await expect(applyMediaKitUpload("creator-1", dirtyPdf)).rejects.toThrow(MediaKitInfectedError);
      expect(writeMediaKitFileMock).not.toHaveBeenCalled();
      expect(prismaMock.mediaKit.update).not.toHaveBeenCalled();
    });
  });

  describe("isPdfMagicBytes", () => {
    it("accepts real PDF bytes and rejects anything else", () => {
      expect(isPdfMagicBytes(REAL_PDF_HEADER)).toBe(true);
      expect(isPdfMagicBytes(Buffer.from("not a pdf"))).toBe(false);
      expect(isPdfMagicBytes(Buffer.from(""))).toBe(false);
    });
  });

  describe("upload replaces then reverts with the same public URL", () => {
    it("revert switches mode back to AUTO without touching uploadUrl (URL never changes)", async () => {
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", mode: "AUTO", uploadUrl: "local://media-kits/creator-1-upload.pdf" });

      const result = await revertMediaKitToAuto("creator-1");

      expect(prismaMock.mediaKit.update).toHaveBeenCalledWith({ where: { creatorId: "creator-1" }, data: { mode: "AUTO" } });
      // uploadUrl deliberately untouched by the revert call — the public
      // serving endpoint (routes/mediaKit.ts) is what actually determines
      // which bytes are served, keyed off `mode`, not this field.
      expect(result.uploadUrl).toBe("local://media-kits/creator-1-upload.pdf");
    });
  });

  describe("getPublicMediaKitFile", () => {
    it("serves the upload bytes when mode is UPLOAD", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockResolvedValue({ mode: "UPLOAD", autoVersion: 3 });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue(fakeCreator());
      readMediaKitFileMock.mockResolvedValue(Buffer.from("upload-bytes"));

      const result = await getPublicMediaKitFile("creator-1");

      expect(readMediaKitFileMock).toHaveBeenCalledWith("creator-1", "upload");
      expect(result.bytes.toString()).toBe("upload-bytes");
    });

    it("throws MediaKitFileMissingError if mode is UPLOAD but the file is gone", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockResolvedValue({ mode: "UPLOAD", autoVersion: 1 });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue(fakeCreator());
      readMediaKitFileMock.mockResolvedValue(null);

      await expect(getPublicMediaKitFile("creator-1")).rejects.toThrow(MediaKitFileMissingError);
    });

    it("serves a cached auto render when one already exists", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockResolvedValue({ mode: "AUTO", autoVersion: 2, autoLastRenderedAt: new Date() });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue(fakeCreator());
      readMediaKitFileMock.mockResolvedValue(Buffer.from("cached-auto-bytes"));

      const result = await getPublicMediaKitFile("creator-1");

      expect(result.bytes.toString()).toBe("cached-auto-bytes");
      expect(prismaMock.mediaKit.update).not.toHaveBeenCalled(); // no regenerate triggered
    });

    it("lazily renders on first request when no auto file has ever been cached", async () => {
      prismaMock.mediaKit.findUniqueOrThrow.mockResolvedValue({ mode: "AUTO", autoVersion: 1, autoLastRenderedAt: null });
      prismaMock.creator.findUniqueOrThrow.mockResolvedValue(fakeCreator());
      prismaMock.rateCard.findMany.mockResolvedValue([]);
      prismaMock.mediaKit.update.mockResolvedValue({ creatorId: "creator-1", autoVersion: 2 });
      readMediaKitFileMock.mockResolvedValue(Buffer.from("freshly-rendered"));

      const result = await getPublicMediaKitFile("creator-1");

      expect(writeMediaKitFileMock).toHaveBeenCalled();
      expect(result.version).toBe(2);
    });
  });
});
