/**
 * Offline unit tests for the product-page extras and the category-page
 * extractors. Fixtures mirror the real Apollo cache shapes observed on live
 * pages (reference indirection included) — no network calls.
 */
import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import {
  extractBreadcrumb,
  extractCampaign,
  extractDescription,
  extractMedia,
  extractRatingSummary,
  extractSpecs,
} from '../src/api/productExtras.js';
import {
  categoryUrl,
  extractCategoryProducts,
  extractCategorySummary,
  extractCategoryTotal,
  extractCategoryTree,
  extractRecommendations,
  extractRelatedCategories,
} from '../src/api/categoryPage.js';

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

const PREFIX = '$ROOT_QUERY.pdpMainInfo({"productKey":"x","shopDomain":"y"})';
const RATING_BASE = '$ROOT_QUERY.productrevGetProductRatingAndTopics({"productID":"103083043470"})';

function productCache(): Record<string, unknown> {
  const c: Record<string, unknown> = {};

  // Rating + topics
  c[`${RATING_BASE}.rating`] = {
    positivePercentageFmt: '100% pembeli merasa puas',
    ratingScore: '5.0',
    totalRating: 3,
    totalRatingWithImage: 1,
  };
  const counts = [3, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) {
    c[`${RATING_BASE}.rating.detail.${i}`] = {
      rate: 5 - i,
      totalReviews: counts[i],
      percentageFloat: i === 0 ? 100 : 0,
    };
  }
  c[`${RATING_BASE}.topics.0`] = {
    rating: 5,
    formatted: 'Kualitas Barang',
    key: 'kualitas',
    reviewCount: 2,
  };

  // Campaign lives on a different component index than the description —
  // the extractors must scan, not assume a fixed slot.
  c[`${PREFIX}.components.3.data.0.campaign`] = {
    campaignID: '57261275',
    campaignTypeName: 'Guncang 8.8',
    percentageAmount: 50,
    originalPrice: 130000,
    discountedPrice: 64999,
    originalStock: 20,
    stock: 20,
    stockSoldPercentage: 33,
    startDate: '2026-08-03 00:00:00',
    endDate: '2026-08-09 07:00:00',
    isActive: true,
  };
  c[`${PREFIX}.components.3.data.0.thematicCampaign`] = { campaignName: 'Promosi Tokopedia' };
  c[`${PREFIX}.components.3.data.0.isCashback`] = { percentage: 5 };

  // Description + spec rows
  c[`${PREFIX}.components.5.data.0.productDetailDescription`] = {
    title: 'Deskripsi',
    content: 'Cotton Combed 24s\nM : Lebar dada 48 cm\nL : Lebar dada 51 cm',
  };
  c[`${PREFIX}.components.5.data.0.content.0`] = {
    title: 'Kondisi',
    subtitle: 'Baru',
    applink: '',
  };
  c[`${PREFIX}.components.5.data.0.content.1`] = {
    title: 'Kategori',
    subtitle: 'Kaos Pria',
    applink: 'https://www.tokopedia.com/p/fashion-pria/atasan-pria/kaos-pria',
  };
  c[`${PREFIX}.components.5.data.0.content.2`] = { title: 'Empty', subtitle: '' }; // dropped

  // Media
  c[`${PREFIX}.components.0.data.0.media.0`] = {
    type: 'image',
    URLOriginal: 'https://img/1-700.jpg',
    URLThumbnail: 'https://img/1-200.jpg',
  };
  c[`${PREFIX}.components.0.data.0.media.1`] = {
    type: 'video',
    URLOriginal: '',
    URLThumbnail: 'https://img/2-200.jpg',
    videoUrl: 'https://video/2.mp4',
  };

  // Category breadcrumb, ordered via refs
  c['pdpCategory1808'] = {
    id: '1808',
    name: 'Kaos Pria',
    detail: [
      { type: 'id', id: 'pdpCategoryDetail1759' },
      { type: 'id', id: 'pdpCategoryDetail1784' },
      { type: 'id', id: 'pdpCategoryDetail824328' },
    ],
  };
  c['pdpCategoryDetail1759'] = {
    id: '1759',
    name: 'Fashion Pria',
    breadcrumbURL: 'https://www.tokopedia.com/p/fashion-pria',
  };
  c['pdpCategoryDetail1784'] = {
    id: '1784',
    name: 'Atasan Pria',
    breadcrumbURL: 'https://www.tokopedia.com/p/fashion-pria/atasan-pria',
  };
  // TikTok-side mirror with no browse URL — must be skipped.
  c['pdpCategoryDetail824328'] = { id: '824328', name: 'Pakaian Pria', breadcrumbURL: '' };

  return c;
}

// ─── productExtras ───────────────────────────────────────────────

function testRating() {
  const c = productCache();

  test('extracts score, totals and satisfaction line', () => {
    const r = extractRatingSummary(c)!;
    strictEqual(r.ratingScore, '5.0');
    strictEqual(r.totalRating, 3);
    strictEqual(r.totalRatingWithImage, 1);
    strictEqual(r.satisfactionText, '100% pembeli merasa puas');
  });

  test('extracts the full 5-star breakdown', () => {
    const r = extractRatingSummary(c)!;
    strictEqual(r.breakdown.length, 5);
    deepStrictEqual(
      r.breakdown.map((b) => b.rate),
      [5, 4, 3, 2, 1],
    );
    strictEqual(r.breakdown[0].totalReviews, 3);
    strictEqual(r.breakdown[0].percentage, 100);
  });

  test('extracts review topics', () => {
    const r = extractRatingSummary(c)!;
    strictEqual(r.topics.length, 1);
    strictEqual(r.topics[0].label, 'Kualitas Barang');
    strictEqual(r.topics[0].reviewCount, 2);
  });

  test('returns null when the product has no rating data', () => {
    strictEqual(extractRatingSummary({}), null);
  });
}

function testCampaign() {
  test('extracts a live campaign with prices and window', () => {
    const p = extractCampaign(productCache())!;
    strictEqual(p.campaignName, 'Guncang 8.8');
    strictEqual(p.thematicName, 'Promosi Tokopedia');
    strictEqual(p.discountPercentage, 50);
    strictEqual(p.originalPrice, 130000);
    strictEqual(p.discountedPrice, 64999);
    strictEqual(p.stockSoldPercentage, 33);
    strictEqual(p.cashbackPercentage, 5);
    strictEqual(p.isActive, true);
    strictEqual(p.endDate, '2026-08-09 07:00:00');
  });

  test('treats a zeroed campaign slot as no campaign', () => {
    const c = productCache();
    c[`${PREFIX}.components.3.data.0.campaign`] = { campaignID: '0', percentageAmount: 0 };
    strictEqual(extractCampaign(c), null);
  });

  test('returns null when there is no campaign at all', () => {
    strictEqual(extractCampaign({}), null);
  });
}

function testDescriptionSpecsMedia() {
  const c = productCache();

  test('extracts the full description including the size chart', () => {
    const d = extractDescription(c)!;
    ok(d.includes('Lebar dada 48 cm'), 'size chart survives');
    ok(d.includes('Cotton Combed 24s'));
  });

  test('returns null when no description component exists', () => {
    strictEqual(extractDescription({}), null);
  });

  test('extracts spec rows and drops valueless ones', () => {
    const rows = extractSpecs(c);
    strictEqual(rows.length, 2);
    deepStrictEqual(
      rows.map((r) => r.title),
      ['Kondisi', 'Kategori'],
    );
    strictEqual(rows[1].url, 'https://www.tokopedia.com/p/fashion-pria/atasan-pria/kaos-pria');
  });

  test('extracts the whole media gallery, images and video', () => {
    const media = extractMedia(c);
    strictEqual(media.length, 2);
    strictEqual(media[0].url, 'https://img/1-700.jpg');
    strictEqual(media[1].type, 'video');
    strictEqual(media[1].videoUrl, 'https://video/2.mp4');
  });

  test('breadcrumb follows refs, keeps order, skips URL-less mirrors', () => {
    const crumbs = extractBreadcrumb(c);
    deepStrictEqual(
      crumbs.map((x) => x.name),
      ['Fashion Pria', 'Atasan Pria'],
    );
    strictEqual(crumbs[0].id, '1759');
  });

  test('breadcrumb is empty when no category node exists', () => {
    deepStrictEqual(extractBreadcrumb({}), []);
  });
}

// ─── categoryPage ────────────────────────────────────────────────

function categoryCache(): Record<string, unknown> {
  const c: Record<string, unknown> = {};

  c['$ROOT_QUERY.searchProduct({"params":"&sc=1808"})'] = {
    count: 19048626,
    // Deliberately not in AceSearchProduct key order — ranking comes from here.
    products: [
      { type: 'id', id: 'AceSearchProduct200' },
      { type: 'id', id: 'AceSearchProduct100' },
      { type: 'id', id: 'AceSearchProductMissing' }, // dangling ref, must be skipped
    ],
  };
  c['AceSearchProduct100'] = {
    id_str_auto_: '100',
    name: 'Kaos A',
    url: 'https://www.tokopedia.com/s/kaos-a?extParam=tracking',
    image_url_700: 'https://img/a.jpg',
    price: 'Rp135.000',
    price_int: 135000,
    original_price: 'Rp270.000',
    discount_percentage: 50,
    rating: 4.8,
    count_review: 12,
    is_preorder: false,
    shop: { type: 'id', id: 'AceShop1' },
  };
  c['AceSearchProduct200'] = {
    id_str_auto_: '200',
    name: 'Kaos B',
    url: 'https://www.tokopedia.com/s/kaos-b',
    image_url: 'https://img/b.jpg',
    price: 'Rp99.000',
    price_int: 99000,
    rating: 0,
    count_review: 0,
    is_preorder: true,
    shop: { type: 'id', id: 'AceShop1' },
  };
  c['AceShop1'] = { name: 'THIRD DAY', location: 'Bandung', is_official: true };

  c['recommendationItem900'] = {
    id_str_auto_: '900',
    name: 'Kaos Rec',
    url: 'https://www.tokopedia.com/s/kaos-rec?x=1',
    imageUrl: 'https://img/r.jpg',
    price: 'Rp193.000',
    priceInt: 193000,
    rating: 5,
    countReview: 2,
    shop: { type: 'id', id: 'shop1' },
  };
  c['shop1'] = { name: 'Rec Shop', location: 'Jakarta' };

  c['RelatedCategory1809'] = {
    id_str_auto_: '1809',
    name: 'Kaos Polo Pria',
    url: 'https://www.tokopedia.com/p/fashion-pria/atasan-pria/polo-shirt-pria',
  };

  c['CategoryData1808'] = {
    id_str_auto_: '1808',
    name: 'Kaos Pria',
    url: '/p/fashion-pria/atasan-pria/kaos-pria',
    description: 'Beli Kaos Pria...',
    parent_str_auto_: '1784',
    rootId_str_auto_: '1759',
  };

  c['AllCategoryResp1759'] = {
    id: '1759',
    name: 'Fashion Pria',
    identifier: 'fashion-pria',
    child: [{ type: 'id', id: 'AllCategoryResp1784' }],
  };
  c['AllCategoryResp1784'] = {
    id: '1784',
    name: 'Atasan Pria',
    identifier: 'fashion-pria_atasan-pria',
    child: [],
  };

  return c;
}

function testCategoryUrl() {
  test('accepts a bare path', () => {
    strictEqual(
      categoryUrl('fashion-pria/atasan-pria'),
      'https://www.tokopedia.com/p/fashion-pria/atasan-pria',
    );
  });
  test('accepts an underscore identifier', () => {
    strictEqual(
      categoryUrl('fashion-pria_atasan-pria'),
      'https://www.tokopedia.com/p/fashion-pria/atasan-pria',
    );
  });
  test('accepts a /p/ prefixed path', () => {
    strictEqual(categoryUrl('/p/elektronik'), 'https://www.tokopedia.com/p/elektronik');
  });
  test('passes a full URL through unchanged', () => {
    strictEqual(categoryUrl('https://www.tokopedia.com/p/x/y'), 'https://www.tokopedia.com/p/x/y');
  });
  test('empty input resolves to the category index', () => {
    strictEqual(categoryUrl(''), 'https://www.tokopedia.com/p/');
  });
}

function testCategoryExtractors() {
  const c = categoryCache();

  test('products keep the ranked order and skip dangling refs', () => {
    const p = extractCategoryProducts(c);
    strictEqual(p.length, 2);
    deepStrictEqual(
      p.map((x) => x.id),
      ['200', '100'],
    );
  });

  test('product fields resolve, including the shop ref', () => {
    const b = extractCategoryProducts(c)[1];
    strictEqual(b.name, 'Kaos A');
    strictEqual(b.priceInt, 135000);
    strictEqual(b.discountPercentage, 50);
    strictEqual(b.rating, 4.8);
    strictEqual(b.shopName, 'THIRD DAY');
    strictEqual(b.shopIsOfficial, true);
  });

  test('tracking params are stripped from product URLs', () => {
    strictEqual(extractCategoryProducts(c)[1].url, 'https://www.tokopedia.com/s/kaos-a');
  });

  test('preorder flag survives', () => {
    strictEqual(extractCategoryProducts(c)[0].isPreorder, true);
  });

  test('extracts the category total', () => {
    strictEqual(extractCategoryTotal(c), 19048626);
    strictEqual(extractCategoryTotal({}), 0);
  });

  test('extracts recommendations with their own field names', () => {
    const r = extractRecommendations(c);
    strictEqual(r.length, 1);
    strictEqual(r[0].name, 'Kaos Rec');
    strictEqual(r[0].priceInt, 193000);
    strictEqual(r[0].shopName, 'Rec Shop');
    strictEqual(r[0].url, 'https://www.tokopedia.com/s/kaos-rec');
  });

  test('extracts related categories', () => {
    const rel = extractRelatedCategories(c);
    strictEqual(rel.length, 1);
    strictEqual(rel[0].id, '1809');
  });

  test('extracts the category summary with an absolute URL', () => {
    const s = extractCategorySummary(c)!;
    strictEqual(s.name, 'Kaos Pria');
    strictEqual(s.url, 'https://www.tokopedia.com/p/fashion-pria/atasan-pria/kaos-pria');
    strictEqual(s.parentId, '1784');
  });

  test('builds the tree from roots only, with child nesting', () => {
    const tree = extractCategoryTree(c);
    strictEqual(tree.length, 1);
    strictEqual(tree[0].name, 'Fashion Pria');
    strictEqual(tree[0].url, 'https://www.tokopedia.com/p/fashion-pria');
    strictEqual(tree[0].children.length, 1);
    strictEqual(tree[0].children[0].name, 'Atasan Pria');
  });

  test('empty cache yields empty results, not throws', () => {
    deepStrictEqual(extractCategoryProducts({}), []);
    deepStrictEqual(extractRecommendations({}), []);
    deepStrictEqual(extractCategoryTree({}), []);
    strictEqual(extractCategorySummary({}), null);
  });
}

// ─── Run ─────────────────────────────────────────────────────────

console.log('productExtras — rating summary:');
testRating();
console.log('\nproductExtras — campaign:');
testCampaign();
console.log('\nproductExtras — description, specs, media, breadcrumb:');
testDescriptionSpecsMedia();
console.log('\ncategoryPage — URL normalisation:');
testCategoryUrl();
console.log('\ncategoryPage — extractors:');
testCategoryExtractors();
