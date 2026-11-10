// CacheProvider interface — boundary for token denylists and temporary keys.
// Implementations: cache.mock.ts (in-memory dev/test) · cache.real.ts (Redis).

export interface CacheProvider {
  /** Retrieve a string value from cache. Returns null if not exists or expired. */
  get(key: string): Promise<string | null>;

  /**
   * Set a key-value pair in cache.
   * @param key - The key.
   * @param value - The string value.
   * @param ttlSeconds - Optional time-to-live in seconds.
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /** Delete a key from cache. */
  del(key: string): Promise<void>;
}
