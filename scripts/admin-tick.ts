import { runAdminTick } from "../apps/api/src/admin/cron/tick.js";

async function main() {
  console.log(`[admin:tick] Starting admin cron tick at ${new Date().toISOString()}...`);
  const result = await runAdminTick(new Date());
  console.log(`[admin:tick] Finished with status=${result.status} in ${result.durationMs}ms`);
  console.log(`  Jobs executed: ${result.jobsExecuted.join(", ") || "none"}`);
  console.log(`  Jobs deferred: ${result.jobsDeferred.join(", ") || "none"}`);
  console.log(`  Alerts active: ${result.alertsTriggered}, auto-resolved: ${result.alertsResolved}`);
  if (result.errors) {
    console.error("  Errors encountered:", result.errors);
  }
}

main().catch((err) => {
  console.error("[admin:tick] Fatal error:", err);
  process.exit(1);
});

