import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling, formatIDR, truncate } from '../utils/errors.js';
import type { SearchResponse, SearchProductParams } from '../api/types.js';

const SEARCH_QUERY = `
query SearchProductV5Query($params: String!) {
  searchProductV5(params: $params) {
    header {
      totalData
      responseCode
      keywordProcess
      keywordIntention
      additionalParams
    }
    data {
      totalDataText
      related {
        relatedKeyword
        position
      }
      suggestion {
        currentKeyword
        suggestion
        query
        text
      }
      products {
        oldID: id
        id: id_str_auto_
        name
        url
        applink
        mediaURL {
          image
          image300
        }
        shop {
          oldID: id
          id: id_str_auto_
          name
          url
          city
          tier
        }
        badge {
          oldID: id
          id: id_str_auto_
          title
          url
        }
        price {
          text
          number
          range
          original
          discountPercentage
        }
        freeShipping {
          url
        }
        labelGroups {
          position
          title
          type
          url
        }
        labelGroupsVariant {
          title
          type
          typeVariant
          hexColor
        }
        category {
          oldID: id
          id: id_str_auto_
          name
          breadcrumb
        }
        rating
        wishlist
        meta {
          oldParentID: parentID
          parentID: parentID_str_auto_
          oldWarehouseID: warehouseID
          warehouseID: warehouseID_str_auto_
          isImageBlurred
          isPortrait
        }
      }
    }
  }
}
`;

function buildSearchParams(p: SearchProductParams): string {
  const page = p.page ?? 1;
  const rows = p.rows ?? 20;
  const start = (page - 1) * rows;

  const params = new URLSearchParams({
    condition: String(p.condition ?? ''),
    device: 'desktop',
    enter_method: 'normal_search',
    l_name: 'sre',
    navsource: '',
    fcity: p.location ?? '',
    ob: String(p.orderBy ?? 23),
    page: String(page),
    q: p.query,
    rt: p.rating ?? '',
    pmin: String(p.priceMin ?? ''),
    pmax: String(p.priceMax ?? ''),
    related: 'true',
    rows: String(rows),
    safe_search: 'false',
    sc: '',
    scheme: 'https',
    shipping: '',
    show_adult: 'false',
    source: 'search',
    srp_component_id: '02.01.00.00',
    srp_page_id: '',
    srp_page_title: '',
    st: 'product',
    start: String(start),
    topads_bucket: 'true',
    unique_id: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    variants: '',
    warehouses: '',
  });

  return params.toString();
}


export function registerSearchTools(server: McpServer): void {
  // ── search_products ─────────────────────────────────────────────────────────
  server.tool(
    'search_products',
    'Search for products on Tokopedia with filtering, sorting, and pagination. Returns product names, prices, ratings, shop details, and direct URLs.',
    {
      query: z.string().min(1).describe('The search query, e.g. "laptop gaming", "sepatu nike"'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      rows: z
        .number()
        .int()
        .min(1)
        .max(60)
        .default(20)
        .describe('Results per page, 1-60 (default: 20)'),
      orderBy: z
        .union([z.literal(23), z.literal(3), z.literal(4), z.literal(5), z.literal(8)])
        .optional()
        .describe('Sort: 23=relevance, 3=price low→high, 4=price high→low, 5=newest, 8=most sold'),
      condition: z
        .union([z.literal(1), z.literal(2)])
        .optional()
        .describe('Condition: 1=new, 2=used'),
      rating: z
        .string()
        .optional()
        .describe('Minimum rating filter, e.g. "4" or "4,5" for 4-5 stars'),
      priceMin: z.number().optional().describe('Minimum price in IDR'),
      priceMax: z.number().optional().describe('Maximum price in IDR'),
      location: z
        .string()
        .optional()
        .describe('City/location ID(s), comma-separated. Use get_filters_and_sorts to find IDs.'),
    },
    async (params) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key(
          'search',
          params.query,
          params.page,
          params.rows,
          params.orderBy,
          params.condition,
          params.rating,
          params.priceMin,
          params.priceMax,
          params.location
        );

        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const searchParams = buildSearchParams(params as SearchProductParams);

        const data = await gqlRequest<SearchResponse>(
          'SearchProductV5Query',
          SEARCH_QUERY,
          { params: searchParams }
        );

        const header = data.data.searchProductV5.header;
        const products = data.data.searchProductV5.data.products ?? [];

        if (products.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No products found for "${params.query}". Try a different keyword or remove filters.`,
              },
            ],
          };
        }

        const page = params.page ?? 1;
        const rows = params.rows ?? 20;
        const totalData = header.totalData;
        const totalPages = Math.ceil(totalData / rows);

        const lines: string[] = [
          `🛒 Search Results for "${header.keywordProcess || params.query}"`,
          `📊 ${totalData.toLocaleString('id-ID')} total products | Page ${page}/${totalPages}`,
          ``,
        ];

        products.forEach((p, i) => {
          const discount =
            p.price.discountPercentage > 0
              ? ` (-${p.price.discountPercentage}%)`
              : '';
          const freeShip = p.freeShipping?.url ? ' 🚚 Free shipping' : '';
          const officialBadge = p.shop.tier === 3 ? ' [Official Store]' : p.shop.tier === 2 ? ' [Power Merchant]' : '';

          lines.push(`${(page - 1) * rows + i + 1}. **${p.name}**`);
          lines.push(`   💰 ${p.price.text}${discount}${freeShip}`);
          lines.push(`   ⭐ ${p.rating || 'N/A'} | 🏪 ${p.shop.name}${officialBadge} (${p.shop.city})`);
          lines.push(`   🔗 ${p.url}`);
          if (i < products.length - 1) lines.push('');
        });

        if (page < totalPages) {
          lines.push(``, `📄 Use page=${page + 1} to see more results.`);
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );
}
