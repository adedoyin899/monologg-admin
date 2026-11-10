import { buildApp } from "./app.js";
import { env } from "./config/env.js";

// ---------------------------------------------------------------------------
// Server entry point.
//
// Responsibilities:
//  1. Call buildApp() to get a configured Fastify instance.
//  2. Bind to HOST:PORT from the validated env.
//  3. Handle unrecoverable boot errors (exit with a non-zero code).
//
// Tests import buildApp() directly and never go through this file, so they
// don't bind a real port or trigger process.exit().
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀  Monologg API listening at ${address}`);
  } catch (err) {
    app.log.error(err, "Fatal: server failed to start");
    process.exit(1);
  }
}

main();
