/**
 * Offline unit tests for variant extraction functions.
 * Uses hand-crafted Apollo cache fixtures — no network calls.
 */
import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { findBasicInfo, parseCache, metaContent } from '../src/api/productPage.js';
import { extractVariants } from '../src/api/variantExtractor.js';

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

// ─── metaContent ─────────────────────────────────────────────────

function testMetaContent() {
  const html = [
    '<meta content="Rp44.000" property="product:price:amount">',
    '<meta property="og:title" content="Some Product">',
    '<meta name="twitter:data1" content="Bandung">',
    '<meta content="first" property="og:image">',
    '<meta property="og:image" content="second">',
  ].join('\n');

  test('property before content', () => {
    strictEqual(metaContent(html, 'og:title'), 'Some Product');
  });

  test('content before property', () => {
    strictEqual(metaContent(html, 'product:price:amount'), 'Rp44.000');
    strictEqual(metaContent(html, 'og:image'), 'second'); // last match wins
  });

  test('name attribute', () => {
    strictEqual(metaContent(html, 'twitter:data1'), 'Bandung');
  });

  test('colons in property name', () => {
    strictEqual(metaContent(html, 'product:price:amount'), 'Rp44.000');
  });

  test('missing meta tag', () => {
    strictEqual(metaContent(html, 'nonexistent'), undefined);
  });

  test('empty html', () => {
    strictEqual(metaContent('', 'og:title'), undefined);
  });
}

// ─── parseCache ──────────────────────────────────────────────────

function testParseCache() {
  test('valid cache', () => {
    const html = '<script>window.__cache = {"a": 1, "b": [2, 3]};\n</script>';
    const result = parseCache(html);
    ok(result !== null);
    deepStrictEqual(result, { a: 1, b: [2, 3] });
  });

  test('cache with nested braces', () => {
    const html =
      '<script>window.__cache = {"outer": {"inner": {"deep": [1,2]}}, "arr": [{"x":1}]};\n</script>';
    const result = parseCache(html);
    ok(result !== null);
    ok(result && typeof (result as Record<string, unknown>).outer === 'object');
  });

  test('cache with strings containing closing-brace sequence', () => {
    // The brace-counting parser handles this because it skips strings
    const html = '<script>window.__cache = {"key": "value with }; inside", "b": 2};\n</script>';
    const result = parseCache(html);
    ok(result !== null);
    strictEqual(result && (result as Record<string, unknown>).key, 'value with }; inside');
  });

  test('cache with escaped quotes in strings', () => {
    const html = '<script>window.__cache = {"key": "val\\"ue"};\n</script>';
    const result = parseCache(html);
    ok(result !== null);
    strictEqual(result && (result as Record<string, unknown>).key, 'val"ue');
  });

  test('no cache in html', () => {
    const result = parseCache('<html><body>no cache here</body></html>');
    strictEqual(result, null);
  });

  test('malformed json returns null', () => {
    const result = parseCache('window.__cache = {invalid json};\n</script>');
    strictEqual(result, null);
  });

  test('empty braces', () => {
    const html = 'window.__cache = {};\n</script>';
    const result = parseCache(html);
    ok(result !== null);
    deepStrictEqual(result, {});
  });
}

// ─── findBasicInfo ───────────────────────────────────────────────

function testFindBasicInfo() {
  test('finds pdpBasicInfo key', () => {
    const cache = { pdpBasicInfo12345: { productID: '12345', shopName: 'TestShop' } };
    const result = findBasicInfo(cache);
    ok(result !== null);
    strictEqual(result!.key, 'pdpBasicInfo12345');
    strictEqual((result!.data as Record<string, unknown>).productID, '12345');
  });

  test('picks first when multiple match', () => {
    const cache = {
      pdpBasicInfo11111: { productID: '11111' },
      pdpBasicInfo99999: { productID: '99999' },
    };
    const result = findBasicInfo(cache);
    strictEqual(result!.key, 'pdpBasicInfo11111');
  });

  test('returns null when no basic info key', () => {
    const cache = { someKey: { a: 1 } };
    const result = findBasicInfo(cache);
    strictEqual(result, null);
  });

  test('returns null when basic info value is a string', () => {
    const cache = { pdpBasicInfo12345: 'not an object' };
    const result = findBasicInfo(cache);
    strictEqual(result, null);
  });
}

// ─── extractVariants — no variants ───────────────────────────────

function testExtractVariantsNoVariants() {
  test('empty cache returns hasVariants:false', () => {
    const result = extractVariants({}, '123');
    strictEqual(result.hasVariants, false);
    strictEqual(result.axes.length, 0);
    strictEqual(result.skus.length, 0);
  });

  test('cache with basic info but no variant prefix returns hasVariants:false', () => {
    const cache = {
      pdpBasicInfo12345: { productID: '12345', shopName: 'Test' },
    };
    const result = extractVariants(cache, '12345');
    strictEqual(result.hasVariants, false);
  });
}

// ─── Build a realistic variant fixture with REF-resolution ───────
//
// Production Apollo caches use `{ type: "id", id: "..." }` references
// for nested objects. This fixture exercises BOTH inline fields AND
// ref-resolution paths.

function buildVariantCache(): Record<string, unknown> {
  const prefix = '$ROOT_QUERY.pdpMainInfo({"productID":"15541510522"})';
  const dataCi = 4; // component index with variant data
  const flagCi = 3; // component index with isVariant flag

  const cache: Record<string, unknown> = {
    // Basic info
    pdpBasicInfo15541510522: {
      productID: '15541510522',
      shopID: '12345',
      shopName: 'TestShop',
      weight: '200',
      weightUnit: 'gr',
      condition: 'NEW',
      url: 'https://www.tokopedia.com/test-shop/test-product',
    },
    '$pdpBasicInfo15541510522.stats': {
      countView: '1000',
      countReview: '50',
      countTalk: '10',
      rating: '4.8',
    },
    '$pdpBasicInfo15541510522.txStats': {
      countSold: '42',
      itemSoldFmt: '42',
    },
  };

  // Variant flag component (different index than data)
  cache[`${prefix}.components.${flagCi}.data.0.variant`] = {
    isVariant: true,
    parentID: '15541510483',
    __typename: 'PDPVariantData',
  };

  // Variant axes
  cache[`${prefix}.components.${dataCi}.data.0.variants.0`] = {
    name: 'kapasitas memori',
    identifier: 'capacity',
    option: [
      {
        __typename: 'PDPVariantOption',
        productVariantOptionID: '2',
        value: '2TB',
        stock: 5,
        hex: null,
      },
      {
        __typename: 'PDPVariantOption',
        productVariantOptionID: '3',
        value: '4TB',
        stock: 3,
        hex: null,
      },
      {
        __typename: 'PDPVariantOption',
        productVariantOptionID: '4',
        value: '5TB',
        stock: 2,
        hex: '',
      },
    ],
  };

  // Apollo cache entries for ref-resolution
  cache['ProductStock:15541510522'] = { stock: 5, isBuyable: true };
  cache['ProductStock:15541510523'] = { stock: 3, isBuyable: false };
  cache['ProductStock:15541510524'] = { stock: 2, isBuyable: true };
  cache['ProductPicture:15541510522'] = { url: 'https://images.tokopedia.net/ref-2tb.png' };
  cache['ProductPicture:15541510523'] = { url: 'https://images.tokopedia.net/ref-4tb.png' };
  cache['ProductPicture:15541510524'] = { url: 'https://images.tokopedia.net/ref-5tb.png' };
  cache['CampaignInfo:15541510523'] = { discountPercentage: 8, originalPriceFmt: 'Rp4.500.000' };

  // Child SKUs with Apollo `{ type:"id", id:"..." }` references
  cache[`${prefix}.components.${dataCi}.data.0.children.0`] = {
    productID: '15541510522',
    price: 2365000,
    priceFmt: 'Rp2.365.000',
    slashPriceFmt: '',
    productName: 'WD Black P10 - 2TB',
    productURL: 'https://www.tokopedia.com/test-shop/test-product-2tb',
    optionID: { type: 'json', json: ['2'] },
    optionName: { type: 'json', json: ['2TB'] },
    stock: { type: 'id', id: 'ProductStock:15541510522' },
    isCOD: true,
    picture: { type: 'id', id: 'ProductPicture:15541510522' },
  };

  cache[`${prefix}.components.${dataCi}.data.0.children.1`] = {
    productID: '15541510523',
    price: 4155000,
    priceFmt: 'Rp4.155.000',
    slashPriceFmt: 'Rp4.500.000',
    productName: 'WD Black P10 - 4TB',
    productURL: 'https://www.tokopedia.com/test-shop/test-product-4tb',
    optionID: { type: 'json', json: ['3'] },
    optionName: { type: 'json', json: ['4TB'] },
    stock: { type: 'id', id: 'ProductStock:15541510523' },
    isCOD: false,
    campaignInfo: { type: 'id', id: 'CampaignInfo:15541510523' },
    picture: { type: 'id', id: 'ProductPicture:15541510523' },
  };

  cache[`${prefix}.components.${dataCi}.data.0.children.2`] = {
    productID: '15541510524',
    price: 4555000,
    priceFmt: 'Rp4.555.000',
    slashPriceFmt: '',
    productName: 'WD Black P10 - 5TB',
    productURL: 'https://www.tokopedia.com/test-shop/test-product-5tb',
    optionID: { type: 'json', json: ['4'] },
    optionName: { type: 'json', json: ['5TB'] },
    stock: { type: 'id', id: 'ProductStock:15541510524' },
    isCOD: true,
    picture: { type: 'id', id: 'ProductPicture:15541510524' },
  };

  return cache;
}

function testExtractVariantsFull() {
  const cache = buildVariantCache();

  test('extracts product and parent IDs', () => {
    const result = extractVariants(cache, '15541510522');
    strictEqual(result.hasVariants, true);
    strictEqual(result.productId, '15541510522');
    strictEqual(result.parentId, '15541510483');
    strictEqual(result.source, 'apollo_cache');
  });

  test('extracts single axis with correct options', () => {
    const result = extractVariants(cache, '15541510522');
    strictEqual(result.axes.length, 1);

    const axis = result.axes[0];
    strictEqual(axis.name, 'kapasitas memori');
    strictEqual(axis.identifier, 'capacity');
    strictEqual(axis.options.length, 3);

    strictEqual(axis.options[0].optionId, '2');
    strictEqual(axis.options[0].value, '2TB');
    strictEqual(axis.options[0].stock, '5');
    strictEqual(axis.options[0].hexColor, '');

    strictEqual(axis.options[1].optionId, '3');
    strictEqual(axis.options[1].value, '4TB');
    strictEqual(axis.options[1].stock, '3');

    strictEqual(axis.options[2].optionId, '4');
    strictEqual(axis.options[2].value, '5TB');
    strictEqual(axis.options[2].stock, '2');
  });

  test('extracts all SKUs with correct pricing and ref-resolved fields', () => {
    const result = extractVariants(cache, '15541510522');
    strictEqual(result.skus.length, 3);

    const sku0 = result.skus[0];
    strictEqual(sku0.productId, '15541510522');
    strictEqual(sku0.price, 2365000);
    strictEqual(sku0.priceFmt, 'Rp2.365.000');
    strictEqual(sku0.slashPriceFmt, '');
    strictEqual(sku0.discountPercentage, 0);
    deepStrictEqual(sku0.optionNames, ['2TB']);
    deepStrictEqual(sku0.optionIds, ['2']);
    strictEqual(sku0.stock, '5'); // resolved via ref
    strictEqual(sku0.isBuyable, true); // resolved via ref
    strictEqual(sku0.isCod, true);
    ok(
      sku0.imageUrl.includes('ref-2tb.png'),
      `imageUrl should be ref-2tb.png, got: ${sku0.imageUrl}`,
    ); // resolved via ref

    const sku1 = result.skus[1];
    strictEqual(sku1.price, 4155000);
    strictEqual(sku1.slashPriceFmt, 'Rp4.500.000');
    strictEqual(sku1.discountPercentage, 8); // resolved via campaignInfo ref
    strictEqual(sku1.stock, '3'); // resolved via ref
    strictEqual(sku1.isBuyable, false); // resolved via ref (isBuyable: false)
    strictEqual(sku1.isCod, false);
    ok(sku1.imageUrl.includes('ref-4tb.png')); // resolved via ref

    const sku2 = result.skus[2];
    strictEqual(sku2.price, 4555000);
    strictEqual(sku2.stock, '2'); // resolved via ref
    strictEqual(sku2.isBuyable, true); // resolved via ref
    strictEqual(sku2.isCod, true);
    ok(sku2.imageUrl.includes('ref-5tb.png')); // resolved via ref
  });

  test('detects varying prices', () => {
    const result = extractVariants(cache, '15541510522');
    strictEqual(result.priceVariesByVariant, true);
  });
}

function testExtractVariantsSamePrices() {
  const cache = buildVariantCache();
  const prefix = '$ROOT_QUERY.pdpMainInfo({"productID":"15541510522"})';
  const dataCi = 4;

  // Make all SKUs have the same price
  for (let i = 0; i < 3; i++) {
    const child = cache[`${prefix}.components.${dataCi}.data.0.children.${i}`] as Record<
      string,
      unknown
    >;
    child.price = 100000;
    child.priceFmt = 'Rp100.000';
  }

  test('priceVariesByVariant false when all prices equal', () => {
    const result = extractVariants(cache, '15541510522');
    strictEqual(result.priceVariesByVariant, false);
  });
}

// ─── hasVariants flag present but data not found ──────────────────

function testExtractVariantsFlagButNoData() {
  const prefix = '$ROOT_QUERY.pdpMainInfo({"productID":"123"})';

  test('hasVariants:true but axes and skus empty when data component missing', () => {
    const cache: Record<string, unknown> = {};
    // Flag component exists but no variant/children data
    cache[`${prefix}.components.3.data.0.variant`] = {
      isVariant: true,
      parentID: '456',
    };
    // No .components.${N}.data.0.variants or .children entries at all

    const result = extractVariants(cache, '123');
    strictEqual(result.hasVariants, true);
    strictEqual(result.axes.length, 0);
    strictEqual(result.skus.length, 0);
    strictEqual(result.parentId, '456');
  });
}

// ─── Unresolved ref → isBuyable: false, stock: null ───────────────

function testExtractVariantsUnresolvedRef() {
  test('SKU with unresolvable stock ref gets isBuyable: false and stock: null', () => {
    const prefix = '$ROOT_QUERY.pdpMainInfo({"productID":"999"})';
    const cache: Record<string, unknown> = {};

    cache[`${prefix}.components.3.data.0.variant`] = {
      isVariant: true,
      parentID: '888',
    };
    cache[`${prefix}.components.4.data.0.variants.0`] = {
      name: 'warna',
      identifier: 'colour',
      option: [{ productVariantOptionID: '1', value: 'Red', stock: 0, hex: '#FF0000' }],
    };
    cache[`${prefix}.components.4.data.0.children.0`] = {
      productID: '999',
      price: 50000,
      priceFmt: 'Rp50.000',
      slashPriceFmt: '',
      productName: 'Test Product',
      productURL: 'https://tokopedia.com/s/test',
      optionID: { type: 'json', json: ['1'] },
      optionName: { type: 'json', json: ['Red'] },
      // Ref points to a cache key that does NOT exist
      stock: { type: 'id', id: 'ProductStock:missing' },
      isCOD: false,
      picture: { url: '' },
    };

    const result = extractVariants(cache, '999');
    strictEqual(result.hasVariants, true);
    strictEqual(result.skus.length, 1);
    strictEqual(result.skus[0].isBuyable, false);
    strictEqual(result.skus[0].stock, null);
  });
}

// ─── Run ─────────────────────────────────────────────────────────

console.log('metaContent tests:');
testMetaContent();
console.log('\nparseCache tests:');
testParseCache();
console.log('\nfindBasicInfo tests:');
testFindBasicInfo();
console.log('\nextractVariants - no variants:');
testExtractVariantsNoVariants();
console.log('\nextractVariants - full extraction:');
testExtractVariantsFull();
testExtractVariantsSamePrices();
testExtractVariantsFlagButNoData();
console.log('\nextractVariants - edge cases:');
testExtractVariantsUnresolvedRef();
