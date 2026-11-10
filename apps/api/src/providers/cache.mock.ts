import type { CacheProvider } from "./cache.interface.js";

// Mock CacheProvider — In-memory Map implementation for dev and test environments.
// - Supports TTL expiry (checks Date.now() against stored timestamp).
// - No external dependencies; runs immediately without a running Redis server.

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

export class MockCacheProvider implements CacheProvider {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Helper method for tests to completely clear stored cache values. */
  clear(): void {
    this.store.clear();
  }
}

export const mockCacheProvider = new MockCacheProvider();
