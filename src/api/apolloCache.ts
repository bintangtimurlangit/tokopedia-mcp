/**
 * Shared helpers for walking Tokopedia's dehydrated Apollo cache
 * (`window.__cache`). The cache is a flat map of string keys to objects, where
 * nested values are either inlined or stored under a generated key and
 * referenced as `{ type: "id", id: "<key>" }`.
 *
 * Kept separate from the individual extractors so `variantExtractor` and
 * `productExtras` walk the cache the same way.
 */

/**
 * Find the Apollo cache key prefix for the pdpMainInfo query result.
 * Keys look like: `$ROOT_QUERY.pdpMainInfo({...}).components.0.data.0.variant`
 * We extract the part before `.components.`.
 */
export function findPdpMainInfoPrefix(cacheObj: Record<string, unknown>): string | null {
  const keys = Object.keys(cacheObj);
  const candidate = keys.find((k) => k.includes('pdpMainInfo') && k.includes('.components.'));
  if (!candidate) return null;
  const idx = candidate.indexOf('.components.');
  if (idx < 0) return null;
  return candidate.substring(0, idx);
}

/**
 * Safely read a value from the cache, handling Apollo reference indirection
 * (`{ type: "id", id: "..." }`) by following it to the actual cache entry.
 */
export function resolveRef(value: unknown, cacheObj: Record<string, unknown>): unknown {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'id' &&
    'id' in value
  ) {
    const refId = (value as Record<string, unknown>).id as string;
    if (refId && refId in cacheObj) {
      return cacheObj[refId];
    }
  }
  return value;
}

/**
 * Resolve a `{ "type": "json", "json": [...] }` wrapper into the inner array.
 */
export function resolveJson(value: unknown): unknown[] {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'json' &&
    'json' in value
  ) {
    return (value as Record<string, unknown>).json as unknown[];
  }
  return [];
}

/** Check whether a value is still an unresolved Apollo reference wrapper. */
export function hasUnresolvedRef(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'id',
  );
}

/** Read a plain object out of the cache, or null when absent or not an object. */
export function objectAt(
  cacheObj: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const raw = cacheObj[key];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Walk `${prefix}.components.{ci}.data.0.{suffix}` across component slots and
 * return the first match. Tokopedia reorders PDP components freely, so nothing
 * may assume a fixed component index.
 */
export function findInComponents(
  cacheObj: Record<string, unknown>,
  prefix: string,
  suffix: string,
  maxComponents = 30,
): Record<string, unknown> | null {
  for (let ci = 0; ci < maxComponents; ci++) {
    const found = objectAt(cacheObj, `${prefix}.components.${ci}.data.0.${suffix}`);
    if (found) return found;
  }
  return null;
}

/**
 * Collect an indexed list living at
 * `${prefix}.components.{ci}.data.0.{listName}.{n}` from whichever component
 * slot holds it, following references as it goes.
 */
export function collectIndexedList(
  cacheObj: Record<string, unknown>,
  prefix: string,
  listName: string,
  maxComponents = 30,
  maxItems = 100,
): Record<string, unknown>[] {
  for (let ci = 0; ci < maxComponents; ci++) {
    if (!objectAt(cacheObj, `${prefix}.components.${ci}.data.0.${listName}.0`)) continue;

    const items: Record<string, unknown>[] = [];
    for (let n = 0; n < maxItems; n++) {
      const item = objectAt(cacheObj, `${prefix}.components.${ci}.data.0.${listName}.${n}`);
      if (!item) break;
      items.push(item);
    }
    if (items.length > 0) return items;
  }
  return [];
}
