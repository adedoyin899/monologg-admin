// One-off smoke test for features.md Phase 1/2: confirms DATABASE_URL (transaction pooler,
// used by the app/Prisma client at runtime) and DIRECT_URL (session pooler, used by
// `prisma migrate`) are present and reachable. This only runs `select 1` — it proves
// connectivity + auth, nothing about schema.
//
// Run with: pnpm --filter @monologg/api run verify:db
//
// Both URLs route through Supabase's pooler host (different ports), not the raw direct
// host (db.<ref>.supabase.co) — that host is IPv6-only unless the project has the paid
// IPv4 add-on, and this environment has no IPv6 route. The session pooler (port 5432 on
// the pooler host) is Supabase's documented IPv4-compatible substitute for tools like
// Prisma migrate that need session semantics — see handoff/log.md Session 12.

import { Client } from "pg";

process.loadEnvFile(new URL("../.env", import.meta.url));

async function check(name, connectionString) {
  if (!connectionString) {
    console.error(`[${name}] missing — not set in apps/api/.env`);
    return false;
  }

  const client = new Client({ connectionString, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const result = await client.query("select 1 as ok");
    console.log(`[${name}] OK — select 1 =`, result.rows[0].ok);
    return true;
  } catch (err) {
    const code = err?.code ?? err?.errno ?? "unknown";
    console.error(`[${name}] FAILED (${code}): ${err.message}`);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const pooledOk = await check("DATABASE_URL (transaction pooler)", process.env.DATABASE_URL);
const directOk = await check("DIRECT_URL (session pooler)", process.env.DIRECT_URL);

console.log("\nSummary:");
console.log(`  DATABASE_URL (transaction pooler): ${pooledOk ? "reachable" : "NOT reachable"}`);
console.log(`  DIRECT_URL (session pooler):       ${directOk ? "reachable" : "NOT reachable"}`);

if (!pooledOk || !directOk) {
  console.error(
    "\nBoth URLs are expected to be reachable — they route through the same IPv4 pooler host " +
      "(different ports). If one fails with ENOTFOUND/ETIMEDOUT, check the pooler host/port in " +
      "apps/api/.env before assuming a network limitation.",
  );
  process.exit(1);
}

process.exit(0);
