/**
 * Tokopedia category pages (`/p/<path>`) are server-rendered the same way
 * product pages are: a `window.__cache` Apollo dump carrying the product grid,
 * recommendations, related categories, and the category tree.
 *
 * Reading them gives browse-by-category and "similar products" without any
 * GraphQL operation to keep byte-matched against Tokopedia's registered schema.
 */
import { loadCachedPage } from './http.js';
import { hasUnresolvedRef, objectAt, resolveRef } from './apolloCache.js';
import { parseCache } from './productPage.js';
import type { CategoryNode, CategoryProduct, CategorySummary } from './types.js';

export interface ParsedCategoryPage {
  cacheObj: Record<string, unknown> | null;
}

const CATEGORY_BASE = 'https://www.tokopedia.com/p/';

/**
 * Turn user input into a category page URL. Accepts a full URL, a `/p/...`
 * path, an `a_b_c` identifier, or a bare `a/b/c` path.
 */
export function categoryUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let path = trimmed.replace(/^\/?p\//, '').replace(/^\//, '');
  // `get_product_detail` breadcrumbs and Tokopedia identifiers use underscores.
  if (!path.includes('/') && path.includes('_')) path = path.replace(/_/g, '/');
  return CATEGORY_BASE + path.replace(/\/+$/, '');
}

export function loadCategoryPage(pathOrUrl: string): Promise<ParsedCategoryPage> {
  return loadCachedPage('categoryPage', categoryUrl(pathOrUrl), (html) => ({
    cacheObj: parseCache(html),
  }));
}

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Strip Tokopedia's search-tracking query string from a product URL. */
function cleanUrl(url: string): string {
  const idx = url.indexOf('?');
  return idx >= 0 ? url.slice(0, idx) : url;
}

/**
 * The category's product grid, in the order Tokopedia ranked it. Read from the
 * ordered `searchProduct(...).products` ref list rather than by scanning
 * `AceSearchProduct*` keys, which are unordered.
 */
export function extractCategoryProducts(cacheObj: Record<string, unknown>): CategoryProduct[] {
  const wrapperKey = Object.keys(cacheObj).find((k) => k.includes('searchProduct('));
  if (!wrapperKey) return [];

  const wrapper = objectAt(cacheObj, wrapperKey);
  if (!wrapper || !Array.isArray(wrapper.products)) return [];

  const products: CategoryProduct[] = [];
  for (const ref of wrapper.products) {
    const raw = resolveRef(ref, cacheObj);
    // A ref whose target is missing resolves to the ref wrapper itself, which
    // would otherwise become a product with every field blank.
    if (!raw || typeof raw !== 'object' || hasUnresolvedRef(raw)) continue;
    const p = raw as Record<string, unknown>;

    const shop = resolveRef(p.shop, cacheObj);
    const s =
      shop && typeof shop === 'object' && !hasUnresolvedRef(shop)
        ? (shop as Record<string, unknown>)
        : {};

    products.push({
      id: str(p.id_str_auto_ ?? p.id),
      name: str(p.name),
      url: cleanUrl(str(p.url)),
      imageUrl: str(p.image_url_700 ?? p.image_url),
      price: str(p.price),
      priceInt: num(p.price_int),
      originalPrice: str(p.original_price),
      discountPercentage: num(p.discount_percentage),
      rating: num(p.rating),
      reviewCount: num(p.count_review),
      isPreorder: p.is_preorder === true,
      shopName: str(s.name),
      shopLocation: str(s.location),
      shopIsOfficial: s.is_official === true,
      shopIsPowerBadge: s.is_power_badge === true,
    });
  }
  return products;
}

/** Total number of products in the category, as Tokopedia reports it. */
export function extractCategoryTotal(cacheObj: Record<string, unknown>): number {
  const wrapperKey = Object.keys(cacheObj).find((k) => k.includes('searchProduct('));
  if (!wrapperKey) return 0;
  const wrapper = objectAt(cacheObj, wrapperKey);
  return wrapper ? num(wrapper.count) : 0;
}

/**
 * Tokopedia's own recommendations for the category. These are a different
 * ranking from the grid — closer to "you might also like".
 */
export function extractRecommendations(cacheObj: Record<string, unknown>): CategoryProduct[] {
  const items: CategoryProduct[] = [];
  for (const key of Object.keys(cacheObj)) {
    if (!/^recommendationItem\d+$/.test(key)) continue;
    const r = objectAt(cacheObj, key);
    if (!r) continue;

    const shop = resolveRef(r.shop, cacheObj);
    const s =
      shop && typeof shop === 'object' && !hasUnresolvedRef(shop)
        ? (shop as Record<string, unknown>)
        : {};

    items.push({
      id: str(r.id_str_auto_ ?? r.id),
      name: str(r.name),
      url: cleanUrl(str(r.url)),
      imageUrl: str(r.imageUrl),
      price: str(r.price),
      priceInt: num(r.priceInt),
      originalPrice: '',
      discountPercentage: 0,
      rating: num(r.rating),
      reviewCount: num(r.countReview),
      isPreorder: false,
      shopName: str(s.name),
      shopLocation: str(s.location),
      shopIsOfficial: s.is_official === true,
      shopIsPowerBadge: s.is_power_badge === true,
    });
  }
  return items;
}

/** Sibling/related categories linked from the page. */
export function extractRelatedCategories(cacheObj: Record<string, unknown>): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const key of Object.keys(cacheObj)) {
    if (!/^RelatedCategory\d+$/.test(key)) continue;
    const c = objectAt(cacheObj, key);
    if (!c) continue;
    out.push({ id: str(c.id_str_auto_ ?? c.id), name: str(c.name), url: str(c.url), children: [] });
  }
  return out;
}

/** Headline info about the category the page is for. */
export function extractCategorySummary(cacheObj: Record<string, unknown>): CategorySummary | null {
  const key = Object.keys(cacheObj).find((k) => /^CategoryData\d+$/.test(k));
  if (!key) return null;
  const c = objectAt(cacheObj, key);
  if (!c) return null;

  const url = str(c.url);
  return {
    id: str(c.id_str_auto_ ?? c.id),
    name: str(c.name),
    url: url.startsWith('http') ? url : `https://www.tokopedia.com${url}`,
    description: str(c.description),
    parentId: str(c.parent_str_auto_ ?? c.parent),
    rootId: str(c.rootId_str_auto_ ?? c.rootId),
  };
}

/**
 * The top-level category taxonomy with one level of children. Every category
 * page ships the same `AllCategoryResp*` tree, so any page can answer "what
 * categories exist".
 */
export function extractCategoryTree(cacheObj: Record<string, unknown>): CategoryNode[] {
  const nodeFor = (key: string, depth: number): CategoryNode | null => {
    const c = objectAt(cacheObj, key);
    if (!c) return null;

    const identifier = str(c.identifier);
    const children: CategoryNode[] = [];
    if (depth > 0 && Array.isArray(c.child)) {
      for (const ref of c.child) {
        const refId =
          ref && typeof ref === 'object' ? str((ref as Record<string, unknown>).id) : '';
        if (!refId) continue;
        const child = nodeFor(refId, depth - 1);
        if (child) children.push(child);
      }
    }

    return {
      id: str(c.id),
      name: str(c.name),
      url: identifier ? CATEGORY_BASE + identifier.replace(/_/g, '/') : '',
      children,
    };
  };

  // Roots are the entries nothing else lists as a child.
  const allKeys = Object.keys(cacheObj).filter((k) => /^AllCategoryResp\d+$/.test(k));
  const childKeys = new Set<string>();
  for (const key of allKeys) {
    const c = objectAt(cacheObj, key);
    if (!c || !Array.isArray(c.child)) continue;
    for (const ref of c.child) {
      if (ref && typeof ref === 'object') childKeys.add(str((ref as Record<string, unknown>).id));
    }
  }

  const roots: CategoryNode[] = [];
  for (const key of allKeys) {
    if (childKeys.has(key)) continue;
    const node = nodeFor(key, 1);
    if (node && node.name) roots.push(node);
  }
  return roots;
}
