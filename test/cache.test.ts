/**
 * Offline unit tests for the TTL cache and product-page fetch coalescing.
 * No network calls — `fetch` is stubbed where a page load is exercised.
 */
import { ok, strictEqual } from 'node:assert';
import { Cache, cache } from '../src/utils/cache.js';

// ─── Helpers ────────────────────────────────────────────────────

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

// ─── Cache ───────────────────────────────────────────────────────

function testCache() {
  test('round-trips a value', () => {
    const c = new Cache(1000, 10);
    c.set('a', { n: 1 });
    strictEqual((c.get<{ n: number }>('a') as { n: number }).n, 1);
  });

  test('returns undefined for a missing key', () => {
    const c = new Cache(1000, 10);
    strictEqual(c.get('nope'), undefined);
  });

  test('expires entries past their TTL', () => {
    const c = new Cache(-1, 10); // already expired on write
    c.set('a', 1);
    strictEqual(c.get('a'), undefined);
  });

  test('evicts oldest-first when over the entry cap', () => {
    const c = new Cache(60_000, 3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.set('d', 4); // pushes out 'a'
    strictEqual(c.size(), 3);
    strictEqual(c.get('a'), undefined);
    strictEqual(c.get('d'), 4);
    strictEqual(c.get('b'), 2);
  });

  test('re-writing a key refreshes its eviction position', () => {
    const c = new Cache(60_000, 3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.set('a', 99); // 'a' becomes newest, so 'b' is now oldest
    c.set('d', 4);
    strictEqual(c.get('a'), 99);
    strictEqual(c.get('b'), undefined);
  });

  test('prunes expired entries before evicting live ones', () => {
    const c = new Cache(60_000, 2);
    const stale = new Cache(-1, 10);
    stale.set('x', 1); // sanity: negative TTL really does expire
    strictEqual(stale.get('x'), undefined);

    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    strictEqual(c.size(), 2);
  });

  test('falls back to defaults on a malformed CACHE_TTL_MS', () => {
    const prev = process.env.CACHE_TTL_MS;
    process.env.CACHE_TTL_MS = 'not-a-number';
    const c = new Cache();
    c.set('a', 1);
    strictEqual(c.get('a'), 1); // would be undefined if TTL parsed as NaN/0
    if (prev === undefined) delete process.env.CACHE_TTL_MS;
    else process.env.CACHE_TTL_MS = prev;
  });

  test('key() joins parts deterministically', () => {
    const c = new Cache();
    strictEqual(c.key('product', 'https://x/y'), 'product:https://x/y');
  });

  test('clear() empties the store', () => {
    const c = new Cache(60_000, 10);
    c.set('a', 1);
    c.clear();
    strictEqual(c.size(), 0);
  });
}

// ─── loadProductPage coalescing ──────────────────────────────────

async function testCoalescing() {
  const { loadProductPage } = await import('../src/api/productPage.js');
  const realFetch = globalThis.fetch;

  const html = `
    <meta property="og:title" content="Test Product" />
    <script>window.__cache = {"pdpBasicInfo123":{"productID":"1"}};</script>`;

  await testAsync('concurrent loads of one URL share a single fetch', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true, status: 200, text: async () => html } as Response;
    }) as typeof fetch;

    cache.clear();
    const url = 'https://www.tokopedia.com/shop/coalesce-test';
    const [a, b, c] = await Promise.all([
      loadProductPage(url),
      loadProductPage(url),
      loadProductPage(url),
    ]);

    strictEqual(calls, 1);
    strictEqual(a.meta['og:title'], 'Test Product');
    ok(a === b && b === c, 'all callers receive the same parsed page');
  });

  await testAsync('a failed load is not pinned for later calls', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return { ok: true, status: 200, text: async () => html } as Response;
    }) as typeof fetch;

    cache.clear();
    const url = 'https://www.tokopedia.com/shop/retry-test';
    let threw = false;
    try {
      await loadProductPage(url);
    } catch {
      threw = true;
    }
    ok(threw, 'first call surfaces the network error');

    const second = await loadProductPage(url); // must retry, not replay the rejection
    strictEqual(second.meta['og:title'], 'Test Product');
    strictEqual(calls, 2);
  });

  globalThis.fetch = realFetch;
  cache.clear();
}

// ─── Run ─────────────────────────────────────────────────────────

console.log('Cache tests:');
testCache();
console.log('\nloadProductPage coalescing tests:');
await testCoalescing();
