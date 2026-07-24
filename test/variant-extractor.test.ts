/**
 * Unit tests for src/api/productPage.ts — metaContent, parseCache, findBasicInfo.
 * Covers the fixes applied in the next commit:
 *   - metaContent reversed attribute order
 *   - parseCache brace-counting vs non-greedy regex
 */
import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { findBasicInfo, parseCache, metaContent } from '../src/api/productPage.js';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

// ─── metaContent ─────────────────────────────────────────────────────────────

function testMetaContent() {
  const html = [
    '<meta property="og:title" content="Sepatu Adidas">',
    '<meta content="Rp44.000" property="product:price:amount">',
    '<meta name="twitter:data1" content="Rp55.000">',
  ].join('\n');

  test('property before content', () => {
    strictEqual(metaContent(html, 'og:title'), 'Sepatu Adidas');
  });

  test('content before property', () => {
    strictEqual(metaContent(html, 'product:price:amount'), 'Rp44.000');
  });

  test('name before content', () => {
    strictEqual(metaContent(html, 'twitter:data1'), 'Rp55.000');
  });

  test('key with colon', () => {
    strictEqual(metaContent(html, 'og:title'), 'Sepatu Adidas');
  });

  test('missing key', () => {
    strictEqual(metaContent(html, 'og:missing'), undefined);
  });

  test('empty html', () => {
    strictEqual(metaContent('', 'og:title'), undefined);
  });
}

// ─── parseCache ──────────────────────────────────────────────────────────────

function testParseCache() {
  test('valid simple cache', () => {
    const html = '<script>window.__cache = {"a":1,"b":"x"};</script>';
    const c = parseCache(html)!;
    ok(c !== null);
    deepStrictEqual(c, { a: 1, b: 'x' });
  });

  test('nested objects', () => {
    const html = '<script>window.__cache = {"outer":{"inner":{"deep":42}}};</script>';
    const c = parseCache(html)!;
    ok(c !== null);
    deepStrictEqual(c, { outer: { inner: { deep: 42 } } });
  });

  test('cache with strings containing closing-brace semicolon sequence', () => {
    // This would be truncated by the old non-greedy regex
    const html = '<script>window.__cache = {"a":"value with }; inside","b":1};</script>';
    const c = parseCache(html)!;
    ok(c !== null);
    strictEqual(c.a, 'value with }; inside');
    strictEqual(c.b, 1);
  });

  test('cache with escaped quotes in strings', () => {
    const html = '<script>window.__cache = {"a":"it\\"s \\"ok\\"","b":2};</script>';
    const c = parseCache(html)!;
    ok(c !== null);
    strictEqual(c.a, 'it"s "ok"');
    strictEqual(c.b, 2);
  });

  test('malformed JSON', () => {
    const html = '<script>window.__cache = {broken: yes};</script>';
    strictEqual(parseCache(html), null);
  });

  test('no cache in html', () => {
    strictEqual(parseCache('<html></html>'), null);
  });

  test('empty html', () => {
    strictEqual(parseCache(''), null);
  });
}

// ─── findBasicInfo ───────────────────────────────────────────────────────────

function testFindBasicInfo() {
  test('finds pdpBasicInfo key', () => {
    const cache = { pdpBasicInfo12345: { productID: '99' } };
    const r = findBasicInfo(cache);
    ok(r !== null);
    strictEqual(r.key, 'pdpBasicInfo12345');
    strictEqual(r.data.productID, '99');
  });

  test('returns first when multiple basicInfo keys exist', () => {
    const cache = {
      pdpBasicInfo1: { productID: '1' },
      pdpBasicInfo2: { productID: '2' },
    };
    const r = findBasicInfo(cache)!;
    strictEqual(r.data.productID, '1');
  });

  test('returns null when no basicInfo key', () => {
    strictEqual(findBasicInfo({ a: 1, b: 2 }), null);
  });

  test('returns null when value is not an object', () => {
    strictEqual(findBasicInfo({ pdpBasicInfo123: null }), null);
  });
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log('metaContent tests:');
testMetaContent();
console.log('\nparseCache tests:');
testParseCache();
console.log('\nfindBasicInfo tests:');
testFindBasicInfo();
console.log('\n✓ All productPage tests passed.');
