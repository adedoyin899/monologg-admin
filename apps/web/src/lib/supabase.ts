// Phase 12B: Supabase client singleton for the web app.
//
// Usage: import { supabase, SUPABASE_MODE } from "./supabase"
//   - supabase is null in ALL-MOCK mode (VITE_SUPABASE_URL not set)
//   - SUPABASE_MODE is "real" | "mock"
//
// ⚠ Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are exposed here.
// The service role key (server-side only) must NEVER be imported here.
// See apps/api/.env.example for the server-only keys.
//
// Callers should guard with `if (!supabase) { /* mock path */ }` before any
// real Supabase call — this makes ALL-MOCK mode work identically to before.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Supabase client, or null if running in ALL-MOCK mode.
 * Always check for null before calling any Supabase method.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * "real" when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are both set.
 * "mock" otherwise — ALL-MOCK mode; Supabase sign-in buttons are hidden/disabled.
 */
export const SUPABASE_MODE: "real" | "mock" = supabase !== null ? "real" : "mock";
