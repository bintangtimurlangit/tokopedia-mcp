import { TokopediaAPIError } from './client.js';
import { cache } from '../utils/cache.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
 * Fetch the server-rendered HTML for a Tokopedia product page.
 */
async function fetchProductPage(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  } catch (err) {
    throw new TokopediaAPIError(
      `Network error loading product page: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      'productPage',
    );
  }
  if (!res.ok) {
    throw new TokopediaAPIError(
      `Tokopedia returned HTTP ${res.status} for the product page`,
      res.status,
      'productPage',
    );
  }
  return res.text();
}

/**
 * Extract an HTML <meta> tag's content attribute by property/name.
 */
export function metaContent(html: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)="${key.replace(/[:]/g, '\\:')}"[^>]+content="([^"]*)"`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : undefined;
}

/** Extract the dehydrated Apollo cache (`window.__cache = {...};`). */
export function parseCache(html: string): Record<string, unknown> | null {
  const m = html.match(/window\.__cache\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
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
 * Caches the *parsed object* (not the rendered text) keyed by URL so that
 * `get_product_detail` and `get_product_variants` can share a single HTML
 * fetch when called back-to-back by the same agent.
 */
export async function loadProductPage(url: string): Promise<ParsedProductPage> {
  const cacheKey = cache.key('productPage', url);
  const cached = cache.get<ParsedProductPage>(cacheKey);
  if (cached) return cached;

  const html = await fetchProductPage(url);
  const result: ParsedProductPage = {
    cacheObj: parseCache(html),
    meta: {
      'og:title': decode(metaContent(html, 'og:title')),
      'twitter:data1': decode(metaContent(html, 'twitter:data1')),
      'product:price:amount': metaContent(html, 'product:price:amount'),
      'og:image': metaContent(html, 'og:image'),
      'twitter:data2': decode(metaContent(html, 'twitter:data2')),
      'og:description': decode(metaContent(html, 'og:description')),
    },
  };

  cache.set(cacheKey, result);
  return result;
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
