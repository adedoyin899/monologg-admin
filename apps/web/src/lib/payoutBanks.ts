export interface NigerianBank {
  code: string;
  name: string;
  isFintech?: boolean;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  { code: "100004", name: "OPay (OPay Digital Services)", isFintech: true },
  { code: "035", name: "Wema Bank / ALAT", isFintech: true },
  { code: "057", name: "Zenith Bank Plc" },
  { code: "058", name: "GTBank (Guaranty Trust Bank)" },
  { code: "044", name: "Access Bank Plc" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "090267", name: "Kuda Bank", isFintech: true },
  { code: "090405", name: "Moniepoint Microfinance Bank", isFintech: true },
  { code: "100033", name: "PalmPay", isFintech: true },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "101", name: "Providus Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "302", name: "Taj Bank" },
  { code: "303", name: "Lotus Bank" },
  { code: "090110", name: "VFD Microfinance Bank", isFintech: true },
];

/**
 * Compare two names ignoring case, extra whitespace, and word ordering.
 * e.g. "Emeka Johnson" matches "JOHNSON EMEKA" and "Emeka Chinedu Johnson".
 */
export function compareKycNames(accountName: string, kycName: string): boolean {
  if (!accountName || !kycName) return false;
  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

  const accTokens = cleanTokens(accountName);
  const kycTokens = cleanTokens(kycName);

  if (accTokens.length === 0 || kycTokens.length === 0) return false;

  // Check if all tokens of KYC name are in account name OR all tokens of account name are in KYC name
  const kycInAcc = kycTokens.every((t) => accTokens.includes(t));
  const accInKyc = accTokens.every((t) => kycTokens.includes(t));

  return kycInAcc || accInKyc;
}

export type BankLookupStatus = "idle" | "looking_up" | "name_matches" | "name_mismatch" | "lookup_failed";

export interface PayoutAccountChangeRequest {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  phoneNumber?: string;
  status: "under_review" | "approved" | "rejected";
  requestedAt: string;
  rejectionReason?: string;
}
