// ─── Search Types ────────────────────────────────────────────────────────────

export interface SearchProductParams {
  query: string;
  orderBy?: number;
  condition?: number;
  rating?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  page?: number;
  rows?: number;
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

// ─── Product Detail Types ─────────────────────────────────────────────────────

export interface ProductVariant {
  productVariantID: string;
  isPrimary: boolean;
  optionName: string;
  optionID: string;
  value: string;
  percent: string;
  price: number;
  priceFormat: string;
  isActive: boolean;
  pictureID: string;
  variantID: string;
}

export interface ProductDetail {
  basic: {
    id: string;
    name: string;
    alias: string;
    description: string;
    url: string;
    applink: string;
    price: number;
    weight: number;
    weightUnit: string;
    condition: number; // 1 = new, 2 = used
    status: number;
    minOrder: number;
    categoryID: string;
    categoryName: string;
    shopID: string;
  };
  media: {
    picture: Array<{ urlThumbnail: string; urlOriginal: string; description: string }>;
    video: Array<{ url: string; type: string }>;
  };
  stats: {
    rating: number;
    countReview: number;
    countSold: number;
    transactionSuccess: number;
    transactionReject: number;
  };
  shop: {
    id: string;
    name: string;
    url: string;
    city: string;
    province: string;
    goldMerchant: boolean;
    officialMerchant: boolean;
    badge: Array<{ title: string; imageURL: string }>;
  };
  wholesale: Array<{
    minQty: number;
    price: number;
    priceFormat: string;
  }>;
  preorder: {
    isPreorder: boolean;
    duration: number;
    timeUnit: string;
  };
  specsGroup: Array<{
    title: string;
    data: Array<{ key: string; value: string }>;
  }>;
}

export interface ProductDetailResponse {
  data: {
    pdpGetLayout: {
      basicInfo: ProductDetail['basic'];
      components: Array<{
        name: string;
        data: unknown[];
      }>;
    };
  };
}

// ─── Shop Types ───────────────────────────────────────────────────────────────

export interface ShopInfo {
  shopCore: {
    shopID: string;
    name: string;
    description: string;
    domain: string;
    url: string;
    tagline: string;
    city: string;
    provinsi: string;
    closeUntil: string;
    openInfo: {
      isOpen: number;
      openDetail: string;
      openTime: string;
      closeTime: string;
    };
  };
  goldOS: {
    isGold: boolean;
    isOfficial: boolean;
    badge: string;
  };
  shopStats: {
    totalTxSuccess: number;
    productSoldFmt: string;
    totalShowcase: number;
  };
  favoriteData: {
    totalFavorite: number;
  };
  shopImages: {
    avatar: string;
    cover: string;
  };
}

export interface ShopInfoResponse {
  data: {
    shopInfoByID: {
      result: ShopInfo[];
      error: { message: string } | null;
    };
  };
}

// ─── Order Types ──────────────────────────────────────────────────────────────

export type OrderStatus = 'all' | 'payment' | 'processed' | 'shipped' | 'delivered' | 'done' | 'cancelled';

export interface OrderProduct {
  title: string;
  imageURL: string;
  inline1: { label: string; textColor: string };
  inline2: { label: string; textColor: string };
}

export interface OrderMetadata {
  upstream: string;
  verticalLabel: string;
  paymentDateStr: string;
  detailURL: { webURL: string };
  status: { label: string; textColor: string; bgColor: string };
  products: OrderProduct[];
  totalPrice: { value: number; label: string };
  buttons: Array<{ Label: string; type: string; actionType: string; webURL: string }>;
}

export interface Order {
  orderUUID: string;
  verticalID: string;
  verticalCategory: string;
  status: string;
  verticalStatus: string;
  metadata: OrderMetadata;
  createTime: string;
  updateTime: string;
}

export interface OrderHistoryResponse {
  data?: {
    uohOrders: {
      orders: Order[];
      totalOrders: number;
      dateLimit: string;
      filtersV2: Array<{ label: string; value: string; isPrimary: boolean }>;
    };
  };
  errors?: Array<{ message: string; path: string[] }>;
}

// ─── Wishlist Types ───────────────────────────────────────────────────────────

export interface WishlistProduct {
  id: string;
  name: string;
  url: string;
  price: number;
  priceFormatIdr: string;
  imageURL: string;
  rating: string;
  countReview: number;
  countTalk: number;
  countSold: string;
  isVariant: boolean;
  shop: {
    id: string;
    name: string;
    url: string;
    city: string;
    goldMerchant: boolean;
    officialMerchant: boolean;
  };
}

export interface WishlistResponse {
  data?: {
    wishlistV2: {
      items: WishlistProduct[];
      totalData: number;
      hasNext: boolean;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface WishlistActionResponse {
  data?: {
    addWishlistV2?: { success: boolean; message: string };
    deleteWishlistV2?: { success: boolean; message: string };
  };
  errors?: Array<{ message: string }>;
}
