// Lightweight in-memory TTL cache
// Prevents hammering Tokopedia's API on repeated identical queries

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000;
// Entries hold whole parsed product pages, so an unbounded map is a slow leak on
// a long-running server. 200 pages is far more than one agent session touches.
const DEFAULT_MAX_ENTRIES = 200;

/** Parse an env var as a positive integer, falling back when unset or malformed. */
function positiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttl: number;
  private maxEntries: number;

  constructor(ttlMs?: number, maxEntries?: number) {
    this.ttl = ttlMs ?? positiveInt(process.env.CACHE_TTL_MS, DEFAULT_TTL_MS);
    this.maxEntries = maxEntries ?? positiveInt(process.env.CACHE_MAX_ENTRIES, DEFAULT_MAX_ENTRIES);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    // Re-inserting moves the key to the end, so the eviction order below stays
    // "oldest write first" rather than "oldest key ever seen".
    this.store.delete(key);
    this.store.set(key, { data, expiresAt: Date.now() + this.ttl });
    this.prune();
  }

  /**
   * Drop expired entries, then evict oldest-first if still over the cap.
   * Amortized on writes — reads stay a plain map lookup.
   */
  private prune(): void {
    if (this.store.size <= this.maxEntries) return;

    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }

    // Map iterates in insertion order, so the first keys are the oldest writes.
    for (const key of this.store.keys()) {
      if (this.store.size <= this.maxEntries) break;
      this.store.delete(key);
    }
  }

  key(...parts: (string | number | boolean | undefined)[]): string {
    return parts.map(String).join(':');
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const cache = new Cache();
export { Cache };
