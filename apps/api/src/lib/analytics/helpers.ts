export interface CoarseClientInfo {
  country: string | null;
  deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string | null;
  os: string | null;
}

/**
 * Extracts a normalized 2-letter ISO uppercase country code from standard edge proxy headers.
 * If header is invalid or missing, returns null. Never stores city or IP.
 */
export function extractEdgeCountry(headers: Record<string, string | string[] | undefined>): string | null {
  const candidate =
    headers["cf-ipcountry"] ||
    headers["x-country-code"] ||
    headers["x-vercel-ip-country"] ||
    headers["cloudfront-viewer-country"] ||
    headers["x-appengine-country"];

  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim().toUpperCase();
  // Valid ISO-2 country codes are exactly 2 uppercase ASCII letters (excluding 'XX', 'T1', etc.)
  if (/^[A-Z]{2}$/.test(trimmed) && trimmed !== "XX" && trimmed !== "T1") {
    return trimmed;
  }
  return null;
}

/**
 * Coarse parsing of User-Agent string to extract device class, browser, and OS.
 * No fine-grained fingerprints or raw IP data.
 */
export function parseCoarseUserAgent(userAgent?: string | null): {
  deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string | null;
  os: string | null;
} {
  if (!userAgent || typeof userAgent !== "string") {
    return {
      deviceClass: "unknown",
      browser: null,
      os: null,
    };
  }

  const ua = userAgent.toLowerCase();

  // 1. Device Class
  let deviceClass: "mobile" | "tablet" | "desktop" | "unknown" = "desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceClass = "tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
    deviceClass = "mobile";
  }

  // 2. Coarse OS
  let os: string | null = null;
  if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
  }

  // 3. Coarse Browser
  let browser: string | null = null;
  if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) {
    browser = "Chrome";
  } else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) {
    browser = "Safari";
  } else if (/firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/opera|opr\//i.test(ua)) {
    browser = "Opera";
  }

  return { deviceClass, browser, os };
}

/**
 * Combines header extraction and user agent parsing into a coarse client metadata object.
 */
export function getCoarseClientInfo(
  headers: Record<string, string | string[] | undefined>,
  userAgent?: string | null
): CoarseClientInfo {
  const country = extractEdgeCountry(headers);
  const { deviceClass, browser, os } = parseCoarseUserAgent(userAgent);
  return { country, deviceClass, browser, os };
}

