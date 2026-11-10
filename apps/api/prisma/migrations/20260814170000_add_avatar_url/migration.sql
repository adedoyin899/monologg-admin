-- Google-provided avatar URL, captured on Supabase Auth sign-in/link.
-- Nullable, additive-only — no existing data affected.
ALTER TABLE "Creator" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Client" ADD COLUMN "avatarUrl" TEXT;
