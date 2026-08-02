import { loadCachedPage } from './http.js';

// Tokopedia's product page is server-rendered: the core product data is no
// longer fetched via a client GraphQL call, it is dehydrated into the HTML as
// OpenGraph/Twitter meta tags plus an Apollo cache on `window.__cache`.
// We fetch the page and read those, which is stable across the site's frequent
// GraphQL schema changes.

export interface ParsedProductPage {
  /** The parsed Apollo cache (`window.__cache`), or null if not found / unparseable. */
  cacheObj: Record<string, unknown> | null;
  /** Extracted <meta> tag values keyed by property/name. */
  meta: Record<string, string | undefined>;
}

/**
 * Extract an HTML <meta> tag's content attribute by property/name.
 * Handles both attribute orders: `property="..." content="..."` and `content="..." property="..."`.
 */
export function metaContent(html: string, key: string): string | undefined {
  const escapedKey = key.replace(/[:]/g, '\\:');
  const re1 = new RegExp(`<meta[^>]+(?:property|name)="${escapedKey}"[^>]+content="([^"]*)"`, 'i');
  const m1 = html.match(re1);
  if (m1) return m1[1];
  const re2 = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${escapedKey}"`, 'i');
  const m2 = html.match(re2);
  return m2 ? m2[1] : undefined;
}

/**
 * Extract the dehydrated Apollo cache (`window.__cache = {...};`).
 * Uses brace-counting to reliably find the full JSON object, avoiding
 * truncation when cache values contain the literal sequence `};`.
 */
export function parseCache(html: string): Record<string, unknown> | null {
  const startIdx = html.indexOf('window.__cache');
  if (startIdx < 0) return null;

  const openIdx = html.indexOf('{', startIdx);
  if (openIdx < 0) return null;

  // Walk characters counting braces to find the matching closing brace
  let braceCount = 0;
  let endIdx = -1;
  for (let i = openIdx; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') braceCount++;
    else if (ch === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    } else if (ch === '"' || ch === "'") {
      // Skip string contents to avoid brace characters inside strings
      const quote = ch;
      i++;
      while (i < html.length && html[i] !== quote) {
        if (html[i] === '\\') i++; // skip escaped char
        i++;
      }
    }
  }

  if (endIdx < 0) return null;

  try {
    return JSON.parse(html.slice(openIdx, endIdx + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Decode basic HTML entities in a string.
 */
export function decode(s?: string): string | undefined {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Load and parse a Tokopedia product page.
 *
 * Caches the *parsed object* (not the rendered text) keyed by URL, and
 * coalesces concurrent loads of the same URL, so that every product tool shares
 * a single HTML fetch whether called back-to-back or in parallel.
 */
export function loadProductPage(url: string): Promise<ParsedProductPage> {
  return loadCachedPage('productPage', url, (html) => ({
    cacheObj: parseCache(html),
    meta: {
      'og:title': decode(metaContent(html, 'og:title')),
      'twitter:data1': decode(metaContent(html, 'twitter:data1')),
      'product:price:amount': metaContent(html, 'product:price:amount'),
      'og:image': metaContent(html, 'og:image'),
      'twitter:data2': decode(metaContent(html, 'twitter:data2')),
      'og:description': decode(metaContent(html, 'og:description')),
    },
  }));
}

/**
 * Locate the `pdpBasicInfo{id}` key inside a parsed Apollo cache.
 */
export function findBasicInfo(cacheObj: Record<string, unknown>): {
  key: string;
  data: Record<string, unknown>;
} | null {
  const keys = Object.keys(cacheObj);
  const biKey = keys.find((k) => /^pdpBasicInfo\d+$/.test(k));
  if (!biKey) return null;
  const biData = cacheObj[biKey];
  if (!biData || typeof biData !== 'object') return null;
  return { key: biKey, data: biData as Record<string, unknown> };
}
