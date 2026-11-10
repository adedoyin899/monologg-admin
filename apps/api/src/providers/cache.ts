import { env } from "../config/env.js";
import { mockCacheProvider } from "./cache.mock.js";
import type { CacheProvider } from "./cache.interface.js";

const isTest = env.NODE_ENV === "test";

let cacheProvider: CacheProvider;

if (isTest || env.CACHE_PROVIDER === "mock") {
  cacheProvider = mockCacheProvider;
} else {
  // Dynamically load RealCacheProvider only when needed. This ensures
  // dev/test suites do not load ioredis dependencies or trigger connection
  // routines when mocking is active.
  const { RealCacheProvider } = await import("./cache.real.js");
  cacheProvider = new RealCacheProvider();
}

export { cacheProvider };
export type { CacheProvider } from "./cache.interface.js";
export { mockCacheProvider } from "./cache.mock.js";
