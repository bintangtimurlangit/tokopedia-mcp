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
