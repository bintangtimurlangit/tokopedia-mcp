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
