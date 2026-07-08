import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';

// Query selections captured verbatim from Tokopedia's live web app.
// The GraphQL gateway validates the requested fields against the registered
// operation — do not trim fields (including __typename) or it rejects the
// request with "Invalid request schema received".
const REVIEW_LIST_QUERY = `query productReviewList($productID: String!, $page: Int!, $limit: Int!, $sortBy: String, $filterBy: String) {
  productrevGetProductReviewList(productID: $productID, page: $page, limit: $limit, sortBy: $sortBy, filterBy: $filterBy) {
    productID
    list {
      id: feedbackID
      variantName
      message
      productRating
      reviewCreateTime
      reviewCreateTimestamp
      isReportable
      isAnonymous
      imageAttachments {
        attachmentID
        imageThumbnailUrl
        imageUrl
        __typename
      }
      videoAttachments {
        attachmentID
        videoUrl
        __typename
      }
      reviewResponse {
        message
        createTime
        __typename
      }
      user {
        userID
        fullName
        image
        url
        __typename
      }
      likeDislike {
        totalLike
        likeStatus
        __typename
      }
      stats {
        key
        formatted
        count
        __typename
      }
      badRatingReasonFmt
      __typename
    }
    shop {
      shopID
      name
      url
      image
      __typename
    }
    hasNext
    totalReviews
    __typename
  }
}`;

interface ReviewListResponse {
  data: {
    productrevGetProductReviewList: {
      productID: string;
      list: Array<{
        id: string;
        variantName: string;
        message: string;
        productRating: number;
        reviewCreateTime: string;
        isAnonymous: boolean;
        imageAttachments: Array<{ imageUrl: string }> | null;
        reviewResponse: { message: string; createTime: string } | null;
        user: { fullName: string } | null;
        likeDislike: { totalLike: number } | null;
      }>;
      shop: { name: string };
      hasNext: boolean;
      totalReviews: number;
    };
  };
}

const SORT_MAP: Record<string, string> = {
  most_helpful: 'informative_score desc',
  newest: 'create_time desc',
  highest_rating: 'quality desc',
  lowest_rating: 'quality asc',
};

const FILTER_MAP: Record<string, string> = {
  all: '',
  with_media: 'with_attachment=true',
  rating_5: 'rating=5',
  rating_4: 'rating=4',
  rating_3: 'rating=3',
  rating_2: 'rating=2',
  rating_1: 'rating=1',
};

export function registerReviewTools(server: McpServer): void {
  server.tool(
    'get_product_reviews',
    'Get customer reviews for a Tokopedia product, including ratings, review text, variant purchased, and seller responses. Provide the numeric product ID from search_products (the `id` field) or get_product_detail.',
    {
      productId: z
        .string()
        .min(1)
        .describe('Numeric product ID (from search_products `id` field), e.g. "13164846045"'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(20).default(10).describe('Reviews per page, max 20 (default: 10)'),
      sort: z
        .enum(['most_helpful', 'newest', 'highest_rating', 'lowest_rating'])
        .default('most_helpful')
        .describe('Sort order (default: most_helpful)'),
      filter: z
        .enum(['all', 'with_media', 'rating_5', 'rating_4', 'rating_3', 'rating_2', 'rating_1'])
        .default('all')
        .describe('Filter reviews (default: all)'),
    },
    async ({ productId, page, limit, sort, filter }) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key('reviews', productId, page, limit, sort, filter);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const data = await gqlRequest<ReviewListResponse>('productReviewList', REVIEW_LIST_QUERY, {
          productID: productId,
          page: page ?? 1,
          limit: limit ?? 10,
          sortBy: SORT_MAP[sort ?? 'most_helpful'] ?? 'informative_score desc',
          filterBy: FILTER_MAP[filter ?? 'all'] ?? '',
        });

        const result = data.data?.productrevGetProductReviewList;
        if (!result) {
          return { content: [{ type: 'text', text: '❌ Could not load reviews for this product.' }] };
        }

        const { list, totalReviews, hasNext } = result;
        if (!list || list.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text:
                  filter && filter !== 'all'
                    ? `No reviews match the "${filter}" filter for this product.`
                    : 'This product has no reviews yet.',
              },
            ],
          };
        }

        const currentPage = page ?? 1;
        const lines: string[] = [
          `📝 **Reviews for ${result.shop?.name ? result.shop.name + "'s product" : 'product'}**`,
          `⭐ ${totalReviews.toLocaleString('id-ID')} total reviews | Page ${currentPage} | sorted by ${sort}`,
          '',
        ];

        list.forEach((r, i) => {
          const stars = '★'.repeat(Math.round(r.productRating)) + '☆'.repeat(5 - Math.round(r.productRating));
          const who = r.isAnonymous ? 'Anonymous' : r.user?.fullName || 'Tokopedia user';
          const likes = r.likeDislike?.totalLike ? ` 👍 ${r.likeDislike.totalLike}` : '';
          lines.push(`${(currentPage - 1) * (limit ?? 10) + i + 1}. ${stars} — **${who}**${likes}`);
          if (r.variantName) lines.push(`   🎨 Variant: ${r.variantName}`);
          if (r.message) lines.push(`   ${truncate(r.message.replace(/\n+/g, ' ').trim(), 300)}`);
          if (r.imageAttachments && r.imageAttachments.length > 0) {
            lines.push(`   🖼 ${r.imageAttachments.length} photo(s) attached`);
          }
          if (r.reviewResponse?.message) {
            lines.push(`   ↳ 🏪 Seller: ${truncate(r.reviewResponse.message.replace(/\n+/g, ' ').trim(), 200)}`);
          }
          lines.push(`   📅 ${r.reviewCreateTime}`);
          if (i < list.length - 1) lines.push('');
        });

        if (hasNext) {
          lines.push('', `📄 Use page=${currentPage + 1} for more reviews.`);
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );
}
