import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling } from '../utils/errors.js';
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
    device: 'desktop',
    enter_method: 'normal_search',
    l_name: 'sre',
    navsource: '',
    ob: String(p.orderBy ?? 23),
    page: String(page),
    q: p.query,
    pmin: String(p.priceMin ?? ''),
    pmax: String(p.priceMax ?? ''),
    related: 'true',
    rows: String(rows),
    safe_search: 'false',
    scheme: 'https',
    show_adult: 'false',
    source: 'search',
    srp_component_id: '02.01.00.00',
    st: 'product',
    start: String(start),
    topads_bucket: 'true',
    unique_id: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    variants: '',
  });

  // Merge arbitrary filter key=value pairs discovered via get_filters_and_sorts.
  // These override defaults, so e.g. { shop_tier: "2", rt: "4,5", fcity: "165" }
  // applies the Official-store, 4★+, and Bandung filters respectively.
  if (p.filters) {
    for (const [key, value] of Object.entries(p.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    }
  }

  return params.toString();
}

export function registerSearchTools(server: McpServer): void {
  server.tool(
    'search_products',
    'Search for products on Tokopedia with sorting, price range, pagination, and arbitrary filters. ' +
      'Returns product names, prices, ratings, shop details, product IDs, and direct URLs. ' +
      'To narrow results (category, brand, Official/Power store, free shipping, location, condition, etc.), ' +
      'first call get_filters_and_sorts to discover valid filter key=value pairs, then pass them in the `filters` argument.',
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
      priceMin: z.number().optional().describe('Minimum price in IDR'),
      priceMax: z.number().optional().describe('Maximum price in IDR'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Filter key=value pairs from get_filters_and_sorts. Examples: ' +
            '{"shop_tier":"2"} = Official/Mall stores, {"shop_tier":"3"} = Power stores, ' +
            '{"rt":"4,5"} = rating 4★ and up, {"fcity":"165"} = a location ID, ' +
            '{"condition":"1"} = new, {"sc":"<categoryId>"} = category, {"preorder":"false"} = ready stock. ' +
            'Multiple filters combine, e.g. {"shop_tier":"2","rt":"4,5"}.'
        ),
    },
    async (params) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key(
          'search',
          params.query,
          params.page,
          params.rows,
          params.orderBy,
          params.priceMin,
          params.priceMax,
          params.filters ? JSON.stringify(params.filters) : undefined
        );

        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const searchParams = buildSearchParams(params as SearchProductParams);

        const data = await gqlRequest<SearchResponse>('SearchProductV5Query', SEARCH_QUERY, {
          params: searchParams,
        });

        const header = data.data.searchProductV5.header;
        const products = data.data.searchProductV5.data.products ?? [];

        if (products.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No products found for "${params.query}". Try a different keyword or loosen the filters.`,
              },
            ],
          };
        }

        const page = params.page ?? 1;
        const rows = params.rows ?? 20;
        const totalData = header.totalData;
        const totalPages = Math.ceil(totalData / rows);

        const filterNote =
          params.filters && Object.keys(params.filters).length > 0
            ? ` | filters: ${Object.entries(params.filters)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}`
            : '';

        const lines: string[] = [
          `🛒 Search Results for "${header.keywordProcess || params.query}"`,
          `📊 ${totalData.toLocaleString('id-ID')} total products | Page ${page}/${totalPages}${filterNote}`,
          ``,
        ];

        products.forEach((p, i) => {
          const discount =
            p.price.discountPercentage > 0 ? ` (-${p.price.discountPercentage}%)` : '';
          const freeShip = p.freeShipping?.url ? ' 🚚 Free shipping' : '';
          const officialBadge =
            p.shop.tier === 3 ? ' [Power Store]' : p.shop.tier === 2 ? ' [Official Store]' : '';

          lines.push(`${(page - 1) * rows + i + 1}. **${p.name}**`);
          lines.push(`   💰 ${p.price.text}${discount}${freeShip}`);
          lines.push(
            `   ⭐ ${p.rating || 'N/A'} | 🏪 ${p.shop.name}${officialBadge} (${p.shop.city}) | 🆔 ${p.id}`
          );
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
