import type { ProductVariantSummary, VariantAxis, VariantOption, VariantSku } from './types.js';

/**
 * Find the Apollo cache key prefix for the pdpMainInfo query result.
 * Keys look like: `$ROOT_QUERY.pdpMainInfo({...}).components.0.data.0.variant`
 * We extract the part before `.components.`.
 */
function findPdpMainInfoPrefix(cacheObj: Record<string, unknown>): string | null {
  const keys = Object.keys(cacheObj);
  // Find any key that contains both pdpMainInfo and .components.
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
function resolveRef(value: unknown, cacheObj: Record<string, unknown>): unknown {
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
function resolveJson(value: unknown): unknown[] {
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
function hasUnresolvedRef(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'type' in value &&
    (value as Record<string, unknown>).type === 'id',
  );
}

/**
 * Extract variant axes from a component in the cache.
 */
function extractAxes(
  cacheObj: Record<string, unknown>,
  prefix: string,
  componentIdx: number,
): VariantAxis[] {
  const axes: VariantAxis[] = [];

  for (let ai = 0; ai < 10; ai++) {
    const axisKey = `${prefix}.components.${componentIdx}.data.0.variants.${ai}`;
    const raw = cacheObj[axisKey];
    if (!raw || typeof raw !== 'object') continue;

    const axis = raw as Record<string, unknown>;
    const options: VariantOption[] = [];

    // Resolve options — they may be inline or via references
    const rawOptions = axis.option;
    if (Array.isArray(rawOptions)) {
      for (let oi = 0; oi < rawOptions.length; oi++) {
        const optRaw = resolveRef(rawOptions[oi], cacheObj);
        if (!optRaw || typeof optRaw !== 'object') continue;
        const opt = optRaw as Record<string, unknown>;
        options.push({
          optionId: String(opt.productVariantOptionID ?? ''),
          value: String(opt.value ?? ''),
          hexColor: String(opt.hex ?? ''),
          stock: opt.stock !== undefined ? String(opt.stock) : null,
        });
      }
    }

    axes.push({
      name: String(axis.name ?? ''),
      identifier: String(axis.identifier ?? ''),
      options,
    });
  }

  return axes;
}

/**
 * Extract child SKUs from a component in the cache.
 */
function extractSkus(
  cacheObj: Record<string, unknown>,
  prefix: string,
  componentIdx: number,
): VariantSku[] {
  const skus: VariantSku[] = [];

  for (let si = 0; si < 200; si++) {
    const childKey = `${prefix}.components.${componentIdx}.data.0.children.${si}`;
    const raw = cacheObj[childKey];
    if (!raw || typeof raw !== 'object') continue;

    const child = raw as Record<string, unknown>;

    // Resolve stock reference
    const stockRaw =
      child.stock && typeof child.stock === 'object' && 'type' in child.stock
        ? resolveRef(child.stock, cacheObj)
        : child.stock;
    const stock =
      stockRaw && typeof stockRaw === 'object' && !hasUnresolvedRef(stockRaw)
        ? String((stockRaw as Record<string, unknown>).stock ?? '')
        : null;
    const isBuyable =
      stockRaw && typeof stockRaw === 'object' && !hasUnresolvedRef(stockRaw)
        ? (stockRaw as Record<string, unknown>).isBuyable !== false
        : false;

    // Resolve picture reference
    const pictureRaw =
      child.picture && typeof child.picture === 'object' && 'type' in child.picture
        ? resolveRef(child.picture, cacheObj)
        : child.picture;
    const imageUrl =
      pictureRaw && typeof pictureRaw === 'object'
        ? String((pictureRaw as Record<string, unknown>).url ?? '')
        : '';

    // Resolve campaign info
    const campaignRaw =
      child.campaignInfo && typeof child.campaignInfo === 'object'
        ? resolveRef(child.campaignInfo, cacheObj)
        : null;

    const optionIds = resolveJson(child.optionID).map(String);
    const optionNames = resolveJson(child.optionName).map(String);
    const discountPct =
      campaignRaw && typeof campaignRaw === 'object'
        ? Number((campaignRaw as Record<string, unknown>).discountPercentage ?? 0)
        : 0;

    skus.push({
      productId: String(child.productID ?? ''),
      priceFmt: String(child.priceFmt ?? ''),
      price: Number(child.price ?? 0),
      slashPriceFmt: String(child.slashPriceFmt ?? ''),
      discountPercentage: discountPct,
      optionIds,
      optionNames,
      productName: String(child.productName ?? ''),
      productUrl: String(child.productURL ?? ''),
      stock,
      isBuyable,
      isCod: Boolean(child.isCOD ?? false),
      imageUrl,
    });
  }

  return skus;
}

/**
 * Check whether prices vary across SKUs.
 */
function priceVaries(skus: VariantSku[]): boolean {
  if (skus.length <= 1) return false;
  const first = skus[0].price;
  return skus.some((s) => s.price !== first);
}

/**
 * Find the component index that contains the actual variant data
 * (.variants or .children arrays). This may be different from the
 * component that holds the `isVariant` flag.
 */
function findDataComponentIdx(cacheObj: Record<string, unknown>, prefix: string): number | null {
  for (let ci = 0; ci < 30; ci++) {
    const variantsKey = `${prefix}.components.${ci}.data.0.variants.0`;
    const childrenKey = `${prefix}.components.${ci}.data.0.children.0`;
    if (cacheObj[variantsKey] || cacheObj[childrenKey]) {
      return ci;
    }
  }
  return null;
}

/**
 * Check whether ANY component indicates the product has variants.
 */
function hasAnyVariantFlag(cacheObj: Record<string, unknown>, prefix: string): boolean {
  for (let ci = 0; ci < 30; ci++) {
    const variantKey = `${prefix}.components.${ci}.data.0.variant`;
    const raw = cacheObj[variantKey];
    if (raw && typeof raw === 'object') {
      const vc = raw as Record<string, unknown>;
      if (vc.isVariant === true) return true;
    }
  }
  return false;
}

/**
 * Find parent ID from the first component that has it.
 */
function findParentId(cacheObj: Record<string, unknown>, prefix: string): string {
  for (let ci = 0; ci < 30; ci++) {
    const variantKey = `${prefix}.components.${ci}.data.0.variant`;
    const raw = cacheObj[variantKey];
    if (raw && typeof raw === 'object') {
      const vc = raw as Record<string, unknown>;
      if (vc.parentID) return String(vc.parentID);
    }
  }
  return '';
}

/**
 * Extract variant information from a parsed Apollo cache object.
 *
 * Returns a ProductVariantSummary (with hasVariants: false) if the product
 * has no variants or the variant data cannot be located. This is a pure
 * function with no side effects — easy to unit-test against cache fixtures.
 */
export function extractVariants(
  cacheObj: Record<string, unknown>,
  productId: string,
): ProductVariantSummary {
  const empty = (): ProductVariantSummary => ({
    productId,
    parentId: '',
    hasVariants: false,
    axes: [],
    skus: [],
    priceVariesByVariant: false,
    source: 'apollo_cache',
  });

  const prefix = findPdpMainInfoPrefix(cacheObj);
  if (!prefix) return empty();

  // Check whether this product has variants at all
  const hasVariants = hasAnyVariantFlag(cacheObj, prefix);
  if (!hasVariants) {
    // Even without the flag, try to find data — some products may
    // have variants embedded without the explicit isVariant flag.
    const dataCi = findDataComponentIdx(cacheObj, prefix);
    if (dataCi === null) return empty();

    const axes = extractAxes(cacheObj, prefix, dataCi);
    const skus = extractSkus(cacheObj, prefix, dataCi);
    if (axes.length === 0 && skus.length === 0) return empty();

    return {
      productId,
      parentId: findParentId(cacheObj, prefix),
      hasVariants: true,
      axes,
      skus,
      priceVariesByVariant: priceVaries(skus),
      source: 'apollo_cache',
    };
  }

  // Find the component that actually holds the variant data
  const dataCi = findDataComponentIdx(cacheObj, prefix);
  if (dataCi === null) {
    // We know variants exist but can't find the data component.
    // This is unusual but not impossible.
    return {
      productId,
      parentId: findParentId(cacheObj, prefix),
      hasVariants: true,
      axes: [],
      skus: [],
      priceVariesByVariant: false,
      source: 'apollo_cache',
    };
  }

  const axes = extractAxes(cacheObj, prefix, dataCi);
  const skus = extractSkus(cacheObj, prefix, dataCi);
  const parentId = findParentId(cacheObj, prefix);

  return {
    productId,
    parentId,
    hasVariants: true,
    axes,
    skus,
    priceVariesByVariant: priceVaries(skus),
    source: 'apollo_cache',
  };
}
