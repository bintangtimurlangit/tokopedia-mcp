// ─── Search Types ────────────────────────────────────────────────────────────

export interface SearchProductParams {
  query: string;
  orderBy?: number;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  rows?: number;
  /** Arbitrary Tokopedia filter key=value pairs (from get_filters_and_sorts). */
  filters?: Record<string, string>;
}

export interface ProductPrice {
  text: string;
  number: number;
  range: string;
  original: string;
  discountPercentage: number;
}

export interface ProductShop {
  id: string;
  name: string;
  url: string;
  city: string;
  tier: number;
}

export interface ProductBadge {
  title: string;
  url: string;
}

export interface ProductLabelGroup {
  position: string;
  title: string;
  type: string;
  url: string;
}

export interface ProductMediaURL {
  image: string;
  image300: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  breadcrumb: string;
}

export interface SearchProduct {
  id: string;
  name: string;
  url: string;
  applink: string;
  mediaURL: ProductMediaURL;
  shop: ProductShop;
  badge: ProductBadge[];
  price: ProductPrice;
  freeShipping: { url: string };
  labelGroups: ProductLabelGroup[];
  category: ProductCategory;
  rating: string;
  wishlist: boolean;
}

export interface SearchHeader {
  totalData: number;
  responseCode: string;
  keywordProcess: string;
}

export interface SearchData {
  products: SearchProduct[];
  totalDataText: string;
  related?: {
    relatedKeyword: string;
    position: number;
  };
}

export interface SearchResponse {
  data: {
    searchProductV5: {
      header: SearchHeader;
      data: SearchData;
    };
  };
}

// ─── Filter/Sort Types ────────────────────────────────────────────────────────

export interface FilterOption {
  name: string;
  key: string;
  value: string;
  inputType: string;
  totalData: number;
  isPopular: boolean;
  isNew: boolean;
  child?: FilterOption[];
}

export interface Filter {
  title: string;
  template_name: string;
  options: FilterOption[];
}

export interface Sort {
  name: string;
  key: string;
  value: string;
  inputType: string;
  applyFilter: boolean;
}

export interface FilterSortResponse {
  data: {
    filter_sort_product: {
      data: {
        filter: Filter[];
        sort: Sort[];
      };
    };
  };
}

// ─── Product Variant Types ────────────────────────────────────────────────────

/** One option along one variation axis (e.g. "Black" along the "Warna" axis). */
export interface VariantOption {
  /** Tokopedia's internal option ID. */
  optionId: string;
  /** Human-readable label (e.g. "Hitam", "XL", "256GB"). */
  value: string;
  /** Hex color code when applicable, empty string otherwise. */
  hexColor: string;
  /** Stock count as reported on the option level, or null if unavailable. */
  stock: string | null;
}

/** One axis of variation (e.g. "Warna", "Size", "Storage"). */
export interface VariantAxis {
  /** Human-readable axis name (e.g. "warna", "ukuran"). */
  name: string;
  /** Tokopedia's type identifier (e.g. "colour", "size"). */
  identifier: string;
  /** The available options for this axis. */
  options: VariantOption[];
}

/** A concrete buyable variant combination (one child SKU). */
export interface VariantSku {
  /** Numeric product ID for this specific SKU. */
  productId: string;
  /** Formatted price (e.g. "Rp44.000"). */
  priceFmt: string;
  /** Raw price number in IDR. */
  price: number;
  /** Formatted original/slashed price if discounted, empty string otherwise. */
  slashPriceFmt: string;
  /** Discount percentage, 0 if no discount. */
  discountPercentage: number;
  /** The option IDs this SKU selects (one per axis, same order as axes). */
  optionIds: string[];
  /** Human-readable option values (one per axis, same order as axes). */
  optionNames: string[];
  /** Full product name including variant suffix. */
  productName: string;
  /** Direct URL to this variant's product page. */
  productUrl: string;
  /** Stock count string, or null if unavailable. */
  stock: string | null;
  /** Whether this variant is currently buyable. */
  isBuyable: boolean;
  /** Whether this variant supports cash-on-delivery. */
  isCod: boolean;
  /** URL to the variant's thumbnail image. */
  imageUrl: string;
}

/** Complete variant information for a product. */
export interface ProductVariantSummary {
  /** Numeric product ID (the parent/main listing). */
  productId: string;
  /** The parent product ID linking all variants together. */
  parentId: string;
  /** Whether this product has selectable variants. */
  hasVariants: boolean;
  /** Variation axes (e.g. ["warna", "ukuran"]). Empty when hasVariants is false. */
  axes: VariantAxis[];
  /** Concrete buyable SKU combinations. Empty when hasVariants is false. */
  skus: VariantSku[];
  /** Whether price differs between variants. */
  priceVariesByVariant: boolean;
  /** Data source indicator. */
  source: 'apollo_cache';
}

// ─── Product Page Extras ──────────────────────────────────────────────────────

/** One row of the 5★→1★ rating distribution. */
export interface RatingBreakdown {
  /** Star level, 1-5. */
  rate: number;
  /** Number of reviews at this star level. */
  totalReviews: number;
  /** Share of all reviews at this level, 0-100. */
  percentage: number;
}

/** An aggregated review topic Tokopedia computes (e.g. "Kualitas Barang"). */
export interface ReviewTopic {
  /** Display label. */
  label: string;
  /** Internal topic key. */
  key: string;
  /** Average rating for this topic. */
  rating: number;
  /** How many reviews mention it. */
  reviewCount: number;
}

/** Aggregate rating view for a product, without fetching individual reviews. */
export interface ProductRatingSummary {
  /** Overall score as displayed, e.g. "4.8". */
  ratingScore: string;
  /** Total number of ratings. */
  totalRating: number;
  /** How many of those include a photo. */
  totalRatingWithImage: number;
  /** Tokopedia's satisfaction line, e.g. "100% pembeli merasa puas". */
  satisfactionText: string;
  /** Distribution from 5★ down to 1★. */
  breakdown: RatingBreakdown[];
  /** Aggregated topics, most-reviewed first as returned. */
  topics: ReviewTopic[];
}

/** A running campaign/flash sale on a product. */
export interface ProductCampaign {
  /** Campaign ID; "0" or empty means no active campaign. */
  campaignId: string;
  /** Campaign type name, e.g. "Guncang 8.8". */
  campaignName: string;
  /** Broader promo umbrella, e.g. "Promosi Tokopedia". */
  thematicName: string;
  /** Discount percentage off the original price. */
  discountPercentage: number;
  /** Pre-discount price in IDR. */
  originalPrice: number;
  /** Campaign price in IDR. */
  discountedPrice: number;
  /** Units still available at the campaign price. */
  stock: number;
  /** Units allocated to the campaign. */
  originalStock: number;
  /** Percentage of the campaign allocation already sold. */
  stockSoldPercentage: number;
  /** Campaign start, as Tokopedia formats it. */
  startDate: string;
  /** Campaign end, as Tokopedia formats it. */
  endDate: string;
  /** Whether the campaign is live right now. */
  isActive: boolean;
  /** Cashback percentage, 0 when none. */
  cashbackPercentage: number;
}

/** One labelled spec row shown under a product (Kondisi, Min order, …). */
export interface ProductSpecRow {
  /** Row label. */
  title: string;
  /** Row value. */
  value: string;
  /** Optional link target for the value. */
  url: string;
}

/** One step of a product's category breadcrumb. */
export interface ProductCategoryCrumb {
  /** Numeric category ID. */
  id: string;
  /** Category name. */
  name: string;
  /** Browse URL for the category. */
  url: string;
}

/** One item from a product's media gallery. */
export interface ProductMediaItem {
  /** "image" or "video". */
  type: string;
  /** Full-size URL. */
  url: string;
  /** Thumbnail URL. */
  thumbnail: string;
  /** Source URL when the item is a video. */
  videoUrl: string;
}

// ─── Category Browsing ────────────────────────────────────────────────────────

/** A product as listed on a category page or in its recommendations. */
export interface CategoryProduct {
  /** Numeric product ID. */
  id: string;
  /** Product name. */
  name: string;
  /** Direct product URL, tracking params stripped. */
  url: string;
  /** Thumbnail/preview image URL. */
  imageUrl: string;
  /** Formatted price, e.g. "Rp135.000". */
  price: string;
  /** Raw price in IDR. */
  priceInt: number;
  /** Formatted pre-discount price, empty when not discounted. */
  originalPrice: string;
  /** Discount percentage, 0 when none. */
  discountPercentage: number;
  /** Average rating, 0 when unrated. */
  rating: number;
  /** Number of reviews. */
  reviewCount: number;
  /** Whether the item ships as a preorder. */
  isPreorder: boolean;
  /** Selling shop's name. */
  shopName: string;
  /** Selling shop's city. */
  shopLocation: string;
  /** Whether the shop is an Official Store. */
  shopIsOfficial: boolean;
  /** Whether the shop carries the Power Merchant badge. */
  shopIsPowerBadge: boolean;
}

/** A node in Tokopedia's category taxonomy. */
export interface CategoryNode {
  /** Numeric category ID. */
  id: string;
  /** Category name. */
  name: string;
  /** Browse URL, empty when Tokopedia ships no identifier. */
  url: string;
  /** Direct children, empty at the deepest level requested. */
  children: CategoryNode[];
}

/** Headline information about a single category. */
export interface CategorySummary {
  /** Numeric category ID. */
  id: string;
  /** Category name. */
  name: string;
  /** Absolute browse URL. */
  url: string;
  /** Marketing description Tokopedia shows on the page. */
  description: string;
  /** Parent category ID. */
  parentId: string;
  /** Root (top-level) category ID. */
  rootId: string;
}
