/**
 * PII Masking Utilities for Monologg Admin (PRD Section 12.2 / AC4)
 * Guarantees that sensitive personal identifiers are masked before reaching
 * the admin browser, especially for VIEWER roles and activity feeds.
 */

/**
 * Masks an email address into `j***@e***.com`.
 * Never reveals full mailbox name or full domain name.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) {
    return "***@***.***";
  }

  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!domain) return "***@***.***";

  const maskedLocal = local.length > 1 ? `${local[0]}***` : "*";

  const domainParts = domain.split(".");
  const maskedDomain = domainParts
    .map((part, index) => {
      // Keep TLD (e.g. .com, .ng) readable, mask domain name
      if (index === domainParts.length - 1 && domainParts.length > 1) {
        return part;
      }
      return part.length > 1 ? `${part[0]}***` : "*";
    })
    .join(".");

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masks a full name into `Firstname L.` or `Jo***`.
 */
export function maskName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) {
    return "User";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const single = parts[0];
    return single.length > 2 ? `${single.slice(0, 2)}***` : single;
  }

  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || "";
  return `${first} ${lastInitial}.`;
}

/**
 * Masks a phone number, preserving only country code prefix and last 4 digits.
 * e.g. `+2348012345678` -> `+234***5678`
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 6) {
    return "***";
  }
  const clean = phone.trim();
  const prefix = clean.startsWith("+") ? clean.slice(0, 4) : clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix}***${suffix}`;
}

