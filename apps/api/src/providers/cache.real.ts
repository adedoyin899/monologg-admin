import { Redis } from "ioredis";
import type { CacheProvider } from "./cache.interface.js";
import { env } from "../config/env.js";

// Real CacheProvider — Redis implementation using ioredis.
// Instantiated when CACHE_PROVIDER === "redis".

export class RealCacheProvider implements CacheProvider {
  private client: Redis;

  constructor() {
    const url = env.REDIS_URL || "redis://localhost:6379";
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        // Stop retrying after 3 attempts in 3 seconds to avoid blocking boot
        if (times > 3) return null;
        return 1000;
      },
    });

    this.client.on("error", (err: any) => {
      // Gracefully log errors instead of crashing the process
      console.error("[cache.real] Redis connection error:", err.message);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Close the underlying connection. Re-exported for server teardowns. */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
