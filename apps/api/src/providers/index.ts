// Provider registry — selects mock vs real per NODE_ENV / per-provider env flag.
//
// How selection works:
//   1. If NODE_ENV === "test", ALWAYS use mocks — no env flag overrides this.
//   2. In development/production, read the per-provider env flag (e.g. PAYMENT_PROVIDER).
//      "mock" → mock implementation.  Any real value → real implementation.
//
// The env module validates all flag values at boot, so an invalid flag (e.g. a
// typo like "pastack") fails immediately with a clear message, not silently at
// the first real checkout.
//
// IMPORTANT: import this module (not individual mock/real files) everywhere you
// need a provider. That keeps the selection logic in one place.

import { env } from "../config/env.js";

import { mockPaymentProvider } from "./payment.mock.js";
import { realPaymentProvider } from "./payment.real.js";
import { stripePaymentProvider } from "./payment.stripe.js";
import { airwallexPaymentProvider } from "./payment.airwallex.js";
import { mockKycProvider } from "./kyc.mock.js";
import { realKycProvider } from "./kyc.real.js";
import { mockAiTaggingProvider } from "./aiTagging.mock.js";
import { realAiTaggingProvider } from "./aiTagging.real.js";
import { mockCalendarProvider } from "./calendar.mock.js";
import { realCalendarProvider } from "./calendar.real.js";
import { mockNotifyProvider } from "./notify.mock.js";
import { realNotifyProvider } from "./notify.real.js";
import { mockStorageProvider } from "./storage.mock.js";
import { realStorageProvider } from "./storage.real.js";
import { mockScannerProvider } from "./scanner.mock.js";
import { realScannerProvider } from "./scanner.real.js";
import { mockSupabaseAuthProvider } from "./supabaseAuth.mock.js";
import { realSupabaseAuthProvider } from "./supabaseAuth.real.js";

import type { PaymentProvider } from "./payment.interface.js";
import type { KycProvider } from "./kyc.interface.js";
import type { AiTaggingProvider } from "./aiTagging.interface.js";
import type { CalendarProvider } from "./calendar.interface.js";
import type { NotifyProvider } from "./notify.interface.js";
import type { StorageProvider } from "./storage.interface.js";
import type { ScannerProvider } from "./scanner.interface.js";
import type { SupabaseAuthProvider } from "./supabaseAuth.interface.js";

const isTest = env.NODE_ENV === "test";

// Phase 6: real providers are Paystack-first, with Stripe/Airwallex stubbed behind
// the same interface for later regions (TODO(conflict:X1) — never "fincra").
const REAL_PAYMENT_PROVIDERS = {
  paystack: realPaymentProvider,
  stripe: stripePaymentProvider,
  airwallex: airwallexPaymentProvider,
} as const;

export const paymentProvider: PaymentProvider = isTest || env.PAYMENT_PROVIDER === "mock"
  ? mockPaymentProvider
  : REAL_PAYMENT_PROVIDERS[env.PAYMENT_PROVIDER];

export const kycProvider: KycProvider = isTest || env.KYC_PROVIDER === "mock"
  ? mockKycProvider
  : realKycProvider;

// X3: aiTaggingProvider is for style/vibe tags ONLY — never identity verification.
export const aiTaggingProvider: AiTaggingProvider = isTest || env.AI_PROVIDER === "mock"
  ? mockAiTaggingProvider
  : realAiTaggingProvider;

export const calendarProvider: CalendarProvider = isTest || env.CALENDAR_PROVIDER === "mock"
  ? mockCalendarProvider
  : realCalendarProvider;

export const notifyProvider: NotifyProvider = isTest || env.NOTIFY_PROVIDER === "mock"
  ? mockNotifyProvider
  : realNotifyProvider;

export const storageProvider: StorageProvider = isTest || env.STORAGE_PROVIDER === "mock"
  ? mockStorageProvider
  : realStorageProvider;

export const scannerProvider: ScannerProvider = isTest || env.SCANNER_PROVIDER === "mock"
  ? mockScannerProvider
  : realScannerProvider;

// Phase 12B: Supabase Auth identity bridge.
// Selected by SUPABASE_MODE (not NODE_ENV alone) so production can use "real"
// while dev stays on "mock" without env var juggling.
export const supabaseAuthProvider: SupabaseAuthProvider = isTest || env.SUPABASE_MODE === "mock"
  ? mockSupabaseAuthProvider
  : realSupabaseAuthProvider;

// Re-export interfaces so callers only need to import from "providers/index.ts".
export type { PaymentProvider } from "./payment.interface.js";
export type { KycProvider } from "./kyc.interface.js";
export type { AiTaggingProvider } from "./aiTagging.interface.js";
export type { CalendarProvider } from "./calendar.interface.js";
export type { NotifyProvider } from "./notify.interface.js";
export type { StorageProvider, MediaKind } from "./storage.interface.js";
export type { ScannerProvider, ScanResult } from "./scanner.interface.js";
export type { SupabaseAuthProvider, SupabaseJwtClaims } from "./supabaseAuth.interface.js";
