/**
 * Extractors for the parts of a Tokopedia product page that live in the Apollo
 * cache but were never surfaced: the rating breakdown and review topics, the
 * running campaign, the full seller description, the spec rows, the category
 * breadcrumb, and the media gallery.
 *
 * All of it rides on the page `get_product_detail` already fetches, so these
 * cost no extra network request. Pure functions over a parsed cache — easy to
 * unit-test against fixtures.
 */
import {
  collectIndexedList,
  findInComponents,
  findPdpMainInfoPrefix,
  objectAt,
  resolveRef,
} from './apolloCache.js';
import type {
  ProductCampaign,
  ProductCategoryCrumb,
  ProductMediaItem,
  ProductRatingSummary,
  ProductSpecRow,
  RatingBreakdown,
  ReviewTopic,
} from './types.js';

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rating distribution plus the aggregated review topics Tokopedia computes
 * ("Kualitas Barang", "Sesuai Deskripsi", …). Lets an agent judge a product
 * without paging through individual reviews.
 */
export function extractRatingSummary(
  cacheObj: Record<string, unknown>,
): ProductRatingSummary | null {
  const keys = Object.keys(cacheObj);
  // Key looks like `$ROOT_QUERY.productrevGetProductRatingAndTopics({"productID":"..."}).rating`
  const ratingKey = keys.find(
    (k) => k.includes('productrevGetProductRatingAndTopics') && k.endsWith('.rating'),
  );
  if (!ratingKey) return null;

  const rating = objectAt(cacheObj, ratingKey);
  if (!rating) return null;

  const breakdown: RatingBreakdown[] = [];
  for (let i = 0; i < 5; i++) {
    const detail = objectAt(cacheObj, `${ratingKey}.detail.${i}`);
    if (!detail) continue;
    breakdown.push({
      rate: num(detail.rate),
      totalReviews: num(detail.totalReviews),
      percentage: num(detail.percentageFloat),
    });
  }

  const topicsBase = ratingKey.slice(0, -'.rating'.length);
  const topics: ReviewTopic[] = [];
  for (let i = 0; i < 30; i++) {
    const topic = objectAt(cacheObj, `${topicsBase}.topics.${i}`);
    if (!topic) break;
    topics.push({
      label: str(topic.formatted),
      key: str(topic.key),
      rating: num(topic.rating),
      reviewCount: num(topic.reviewCount),
    });
  }

  return {
    ratingScore: str(rating.ratingScore),
    totalRating: num(rating.totalRating),
    totalRatingWithImage: num(rating.totalRatingWithImage),
    satisfactionText: str(rating.positivePercentageFmt),
    breakdown,
    topics,
  };
}

/**
 * The running campaign (flash sale, "Guncang 8.8", …) with its real
 * before/after price, remaining stock, and end date.
 */
export function extractCampaign(cacheObj: Record<string, unknown>): ProductCampaign | null {
  const prefix = findPdpMainInfoPrefix(cacheObj);
  if (!prefix) return null;

  const campaign = findInComponents(cacheObj, prefix, 'campaign');
  if (!campaign) return null;

  // An inactive slot is still present in the cache with a zeroed campaign ID;
  // treat that as "no promo" rather than reporting a Rp0 discount.
  const campaignId = str(campaign.campaignID);
  if (!campaignId || campaignId === '0') return null;

  const thematic = findInComponents(cacheObj, prefix, 'thematicCampaign');
  const cashback = findInComponents(cacheObj, prefix, 'isCashback');

  return {
    campaignId,
    campaignName: str(campaign.campaignTypeName),
    thematicName: thematic ? str(thematic.campaignName) : '',
    discountPercentage: num(campaign.percentageAmount),
    originalPrice: num(campaign.originalPrice),
    discountedPrice: num(campaign.discountedPrice),
    stock: num(campaign.stock),
    originalStock: num(campaign.originalStock),
    stockSoldPercentage: num(campaign.stockSoldPercentage),
    startDate: str(campaign.startDate),
    endDate: str(campaign.endDate),
    isActive: campaign.isActive === true,
    cashbackPercentage: cashback ? num(cashback.percentage) : 0,
  };
}

/**
 * The seller's full description. `og:description` is a truncated summary, so
 * size charts and material specs — the fields buyers actually need — only exist
 * here.
 */
export function extractDescription(cacheObj: Record<string, unknown>): string | null {
  const prefix = findPdpMainInfoPrefix(cacheObj);
  if (!prefix) return null;
  const desc = findInComponents(cacheObj, prefix, 'productDetailDescription');
  if (!desc) return null;
  const content = str(desc.content).trim();
  return content || null;
}

/** The labelled spec rows shown under the product (Kondisi, Min order, …). */
export function extractSpecs(cacheObj: Record<string, unknown>): ProductSpecRow[] {
  const prefix = findPdpMainInfoPrefix(cacheObj);
  if (!prefix) return [];

  return collectIndexedList(cacheObj, prefix, 'content')
    .map((row) => ({
      title: str(row.title),
      value: str(row.subtitle),
      url: str(row.applink),
    }))
    .filter((row) => row.title !== '' && row.value !== '');
}

/**
 * Category breadcrumb, ordered broadest → narrowest. `pdpCategory{id}` holds
 * the ordered `detail` refs; the standalone `pdpCategoryDetail{id}` entries
 * carry the names and browse URLs.
 */
export function extractBreadcrumb(cacheObj: Record<string, unknown>): ProductCategoryCrumb[] {
  const catKey = Object.keys(cacheObj).find((k) => /^pdpCategory\d+$/.test(k));
  if (!catKey) return [];

  const cat = objectAt(cacheObj, catKey);
  if (!cat || !Array.isArray(cat.detail)) return [];

  const crumbs: ProductCategoryCrumb[] = [];
  for (const ref of cat.detail) {
    const detail = resolveRef(ref, cacheObj);
    if (!detail || typeof detail !== 'object') continue;
    const d = detail as Record<string, unknown>;
    const name = str(d.name);
    if (!name) continue;
    // TikTok-side mirrors (`ttsDetail`) carry no browse URL; skip those so the
    // trail stays clickable.
    const url = str(d.breadcrumbURL);
    if (!url) continue;
    crumbs.push({ id: str(d.id), name, url });
  }
  return crumbs;
}

/** Full media gallery. `og:image` only ever exposes the first image. */
export function extractMedia(cacheObj: Record<string, unknown>): ProductMediaItem[] {
  const prefix = findPdpMainInfoPrefix(cacheObj);
  if (!prefix) return [];

  return collectIndexedList(cacheObj, prefix, 'media')
    .map((m) => ({
      type: str(m.type) || 'image',
      url: str(m.URLOriginal) || str(m.URLMaxRes) || str(m.URLThumbnail),
      thumbnail: str(m.URLThumbnail),
      videoUrl: str(m.videoUrl),
    }))
    .filter((m) => m.url !== '' || m.videoUrl !== '');
}
