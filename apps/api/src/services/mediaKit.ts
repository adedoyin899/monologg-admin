import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Creator, RateCard } from "@prisma/client";
import { prisma } from "../db/client.js";
import { nicheLabel, initials } from "../lib/display.js";
import { writeMediaKitFile, readMediaKitFile, deleteMediaKitFile } from "../lib/mediaKitStorage.js";
import { scannerProvider } from "../providers/index.js";

// Media Kit service (features.md Phase 12A.1). Two independent concerns live
// here: rendering the AUTO PDF from PUBLIC profile data only, and validating/
// storing an UPLOAD override. Neither ever reads or writes anything outside
// MediaKit + the public-facing Creator/RateCard fields already exposed by
// talent discovery (routes/talent.ts) — this is a public-facing document, so
// it must never leak anything a logged-out storefront visitor couldn't
// already see.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB, per spec

const PDF_MAGIC_BYTES = Buffer.from("%PDF-", "utf8");

/**
 * A money formatter for PDF text specifically — NOT lib/display.ts's
 * formatMoney(), which renders currency SYMBOLS ("₦28,000"). pdf-lib's
 * StandardFonts only support WinAnsi encoding, which has no Naira glyph
 * (verified directly: drawText() throws "WinAnsi cannot encode ₦" at render
 * time, not lint/typecheck time — this would have crashed PDF generation for
 * any NGN rate card in production). Embedding a custom Unicode TTF to keep
 * the symbol was the alternative; a currency CODE prefix avoids shipping a
 * new font asset for one glyph.
 */
function formatMoneyForPdf(minorUnits: number, currency: string): string {
  return `${currency} ${(minorUnits / 100).toLocaleString("en-US")}`;
}

export class MediaKitUploadTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(`Media kit upload is ${sizeBytes} bytes, exceeding the ${MAX_UPLOAD_BYTES}-byte (20MB) cap`);
    this.name = "MediaKitUploadTooLargeError";
  }
}
export class MediaKitNotAPdfError extends Error {
  constructor() {
    super("File does not start with the PDF magic bytes (%PDF-) — not a real PDF");
    this.name = "MediaKitNotAPdfError";
  }
}
export class MediaKitInfectedError extends Error {
  constructor() {
    super("Uploaded file failed the virus scan");
    this.name = "MediaKitInfectedError";
  }
}

/** Real PDF magic-byte check — never trusts a `.pdf` filename/extension alone. */
export function isPdfMagicBytes(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

export async function getOrCreateMediaKit(creatorId: string) {
  const existing = await prisma.mediaKit.findUnique({ where: { creatorId } });
  if (existing) return existing;
  // Defensive fallback only — every creator gets one at registration (routes/
  // auth.ts) and the Phase 12A migration backfilled every pre-existing one.
  // Reachable only if that invariant is ever violated by a future bug.
  return prisma.mediaKit.create({ data: { creatorId } });
}

const BRAND = {
  // Stage Cream canvas, Talent Coral accent — the same palette apps/web's
  // design tokens use (handoff/design.md), reproduced in raw RGB since pdf-lib
  // has no access to CSS custom properties.
  cream: rgb(0.98, 0.96, 0.91),
  coral: rgb(0.91, 0.35, 0.32),
  ink: rgb(0.13, 0.11, 0.1),
  inkSoft: rgb(0.4, 0.37, 0.35),
};

/**
 * Renders the AUTO media kit PDF from PUBLIC profile data ONLY: name, niche,
 * location, style tags, verified/celebrity badges, rate cards (or "on
 * request"), bio-as-credits, and a Monologg contact link. Deliberately does
 * NOT embed real headshots or showcase-reel thumbnails — no phase's schema
 * stores a creator photo or a video thumbnail (MediaAsset is a raw video/audio
 * URL with no still-frame extraction anywhere), so a placeholder initials
 * mark is drawn instead of fabricating an image that doesn't exist. A future
 * phase that adds real photo/thumbnail storage can extend this without
 * changing the public contract (GET /creators/:id/media-kit.pdf).
 */
export type MediaKitCreatorInput = Pick<
  Creator,
  "id" | "name" | "niche" | "location" | "bio" | "styleTags" | "verification" | "celebrityBadge"
>;
export type MediaKitRateCardInput = Pick<RateCard, "serviceTitle" | "basePriceAmount" | "basePriceCurrency" | "deliveryTimeline">;

export async function renderMediaKitPdf(creator: MediaKitCreatorInput, rateCards: MediaKitRateCardInput[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.cream });

  // The `/` motif (handoff/design.md's brand mark) as a simple accent stroke —
  // pdf-lib has no SVG import, so the real logo mark isn't embedded; a
  // faithful vector reproduction of it is a design-asset task, not a data one.
  page.drawLine({
    start: { x: 56, y: height - 100 },
    end: { x: 76, y: height - 60 },
    thickness: 4,
    color: BRAND.coral,
  });

  let y = height - 130;
  page.drawText(creator.name, { x: 56, y, size: 28, font: headingFont, color: BRAND.ink });
  y -= 30;

  const badges = [nicheLabel(creator.niche)];
  if (creator.verification === "VERIFIED") badges.push("Verified");
  if (creator.celebrityBadge) badges.push("Celebrity");
  page.drawText(`${badges.join("  ·  ")}  ·  ${creator.location}`, {
    x: 56,
    y,
    size: 13,
    font: bodyFont,
    color: BRAND.inkSoft,
  });
  y -= 20;

  // Initials mark stands in for a real headshot — see docstring above.
  page.drawCircle({ x: width - 90, y: height - 90, size: 34, color: BRAND.coral });
  page.drawText(initials(creator.name), {
    x: width - 90 - bodyFont.widthOfTextAtSize(initials(creator.name), 16) / 2,
    y: height - 96,
    size: 16,
    font: headingFont,
    color: rgb(1, 1, 1),
  });

  if (creator.styleTags.length > 0) {
    y -= 24;
    page.drawText(creator.styleTags.join("   ·   "), { x: 56, y, size: 11, font: bodyFont, color: BRAND.coral });
  }

  if (creator.bio) {
    y -= 40;
    page.drawText("About", { x: 56, y, size: 14, font: headingFont, color: BRAND.ink });
    y -= 20;
    for (const line of wrapText(creator.bio, bodyFont, 11, width - 112)) {
      page.drawText(line, { x: 56, y, size: 11, font: bodyFont, color: BRAND.inkSoft });
      y -= 16;
    }
  }

  y -= 30;
  page.drawText("Rate Cards", { x: 56, y, size: 14, font: headingFont, color: BRAND.ink });
  y -= 22;
  if (rateCards.length === 0) {
    page.drawText("Pricing available on request.", { x: 56, y, size: 11, font: bodyFont, color: BRAND.inkSoft });
    y -= 16;
  } else {
    for (const rc of rateCards) {
      page.drawText(
        `${rc.serviceTitle}  -  ${formatMoneyForPdf(rc.basePriceAmount, rc.basePriceCurrency)}  (${rc.deliveryTimeline})`,
        { x: 56, y, size: 11, font: bodyFont, color: BRAND.inkSoft },
      );
      y -= 16;
    }
  }

  page.drawText(`Book at monologg.co/${creator.id}`, {
    x: 56,
    y: 56,
    size: 11,
    font: headingFont,
    color: BRAND.coral,
  });

  return Buffer.from(await pdf.save());
}

/** Crude but dependency-free word wrap for pdf-lib, which has no built-in layout engine. */
function wrapText(text: string, font: { widthOfTextAtSize(t: string, s: number): number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Regenerates the AUTO PDF and bumps autoVersion — the public URL's cache-bust query param. */
export async function regenerateMediaKit(creator: MediaKitCreatorInput) {
  const rateCards = await prisma.rateCard.findMany({ where: { creatorId: creator.id }, orderBy: { basePriceAmount: "asc" } });
  const bytes = await renderMediaKitPdf(creator, rateCards);
  await writeMediaKitFile(creator.id, "auto", bytes);

  return prisma.mediaKit.update({
    where: { creatorId: creator.id },
    data: { autoVersion: { increment: 1 }, autoLastRenderedAt: new Date() },
  });
}

/**
 * Validates and stores an upload override: real PDF magic bytes (never trusts
 * a filename/extension), the 20MB cap, and a virus scan — in that order, so
 * an oversized or fake-PDF file never reaches the scanner at all.
 */
export async function applyMediaKitUpload(creatorId: string, buffer: Buffer) {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new MediaKitUploadTooLargeError(buffer.length);
  if (!isPdfMagicBytes(buffer)) throw new MediaKitNotAPdfError();

  const scanResult = await scannerProvider.scan(buffer);
  if (scanResult === "INFECTED") throw new MediaKitInfectedError();

  await writeMediaKitFile(creatorId, "upload", buffer);

  return prisma.mediaKit.update({
    where: { creatorId },
    data: { mode: "UPLOAD", uploadUrl: `local://media-kits/${creatorId}-upload.pdf`, uploadSizeBytes: buffer.length },
  });
}

/** Reverts to AUTO. The uploaded file is left on disk (not deleted) so
 * toggling back to UPLOAD later doesn't require re-uploading — only the
 * `mode` flag changes, which is also the only thing the public URL cares
 * about; the URL itself never changes either way. */
export async function revertMediaKitToAuto(creatorId: string) {
  return prisma.mediaKit.update({ where: { creatorId }, data: { mode: "AUTO" } });
}

export class MediaKitFileMissingError extends Error {
  constructor() {
    super("Media kit file is missing on disk for its current mode");
    this.name = "MediaKitFileMissingError";
  }
}

/** Serves whichever bytes are current for public consumption — the AUTO PDF is
 * rendered lazily on first request (and cached to disk) rather than eagerly
 * at every creator update, since most profile edits don't warrant a re-render
 * until the talent actually asks for one (Regenerate) or downloads their kit. */
export async function getPublicMediaKitFile(creatorId: string): Promise<{ bytes: Buffer; version: number }> {
  const [kit, creator] = await Promise.all([
    prisma.mediaKit.findUniqueOrThrow({ where: { creatorId } }),
    prisma.creator.findUniqueOrThrow({ where: { id: creatorId } }),
  ]);

  if (kit.mode === "UPLOAD") {
    const bytes = await readMediaKitFile(creatorId, "upload");
    if (!bytes) throw new MediaKitFileMissingError();
    return { bytes, version: kit.autoVersion };
  }

  const cached = await readMediaKitFile(creatorId, "auto");
  if (cached && kit.autoLastRenderedAt) {
    return { bytes: cached, version: kit.autoVersion };
  }

  const updated = await regenerateMediaKit(creator);
  const bytes = await readMediaKitFile(creatorId, "auto");
  if (!bytes) throw new MediaKitFileMissingError();
  return { bytes, version: updated.autoVersion };
}

/** Test/ops-only escape hatch — not called from any route. */
export async function deleteAllMediaKitFiles(creatorId: string): Promise<void> {
  await Promise.all([deleteMediaKitFile(creatorId, "auto"), deleteMediaKitFile(creatorId, "upload")]);
}
