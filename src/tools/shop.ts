import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';
import type { ShopInfoResponse } from '../api/types.js';

const SHOP_INFO_QUERY = `
query ShopInfoByIDQuery($shopIDs: [Int!]!, $fields: [String!]!, $source: String) {
  shopInfoByID(input: {shopIDs: $shopIDs, fields: $fields, source: $source}) {
    result {
      shopCore {
        shopID
        name
        description
        domain
        url
        tagline
        city
        provinsi
        closeUntil
        openInfo {
          isOpen
          openDetail
          openTime
          closeTime
        }
      }
      goldOS {
        isGold
        isOfficial
        badge
      }
      shopStats {
        totalTxSuccess
        productSoldFmt
        totalShowcase
      }
      favoriteData {
        totalFavorite
      }
      shopImages {
        avatar
        cover
      }
    }
    error {
      message
    }
  }
}
`;

const SHOP_PRODUCTS_QUERY = `
query ShopProductQuery($shopDomain: String!, $filter: productListFilter) {
  GetShopProduct(shopDomain: $shopDomain, filter: $filter) {
    status
    totalData
    data {
      product_id
      product_name
      product_url
      product_rating_average
      product_sold_count
      product_price
      product_price_format
      product_image {
        image_url
      }
      product_label {
        is_free_ongkir
        is_new_product
      }
    }
  }
}
`;

interface ShopProductsResponse {
  data: {
    GetShopProduct: {
      status: string;
      totalData: number;
      data: Array<{
        product_id: string;
        product_name: string;
        product_url: string;
        product_rating_average: number;
        product_sold_count: string;
        product_price: number;
        product_price_format: string;
        product_image: { image_url: string };
        product_label: { is_free_ongkir: boolean; is_new_product: boolean };
      }>;
    };
  };
}

export function registerShopTools(server: McpServer): void {
  // ── get_shop_info ────────────────────────────────────────────────────────────
  server.tool(
    'get_shop_info',
    'Get detailed information about a Tokopedia shop including stats, ratings, location, open status, and Gold/Official Merchant badges.',
    {
      shopId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Numeric shop ID'),
      shopDomain: z
        .string()
        .optional()
        .describe('Shop domain/slug from the URL, e.g. "apple-authorized-reseller"'),
    },
    async ({ shopId, shopDomain }) => {
      return withErrorHandling(async () => {
        if (!shopId && !shopDomain) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Please provide either `shopId` (numeric) or `shopDomain` (slug from URL).',
              },
            ],
          };
        }

        const cacheKey = cache.key('shop_info', shopId, shopDomain);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        // We need a shop ID — if only domain is given, use a zero ID and let the API handle it
        const ids = shopId ? [shopId] : [0];
        const data = await gqlRequest<ShopInfoResponse>(
          'ShopInfoByIDQuery',
          SHOP_INFO_QUERY,
          {
            shopIDs: ids,
            fields: ['shopCore', 'goldOS', 'shopStats', 'favoriteData', 'shopImages'],
            source: 'shop-page',
          }
        );

        const results = data.data.shopInfoByID.result;
        const error = data.data.shopInfoByID.error;

        if (error?.message) {
          return { content: [{ type: 'text', text: `❌ ${error.message}` }] };
        }
        if (!results || results.length === 0) {
          return { content: [{ type: 'text', text: '❌ Shop not found.' }] };
        }

        const shop = results[0];
        const { shopCore, goldOS, shopStats, favoriteData } = shop;

        const badges: string[] = [];
        if (goldOS.isOfficial) badges.push('🏅 Official Store');
        else if (goldOS.isGold) badges.push('⭐ Gold Merchant');

        const openStatus = shopCore.openInfo.isOpen === 1
          ? `✅ Open (${shopCore.openInfo.openTime} – ${shopCore.openInfo.closeTime})`
          : `🔴 Closed until ${shopCore.closeUntil || 'unknown'}`;

        const lines: string[] = [
          `🏪 **${shopCore.name}**${badges.length ? ' ' + badges.join(' ') : ''}`,
          shopCore.tagline ? `_"${shopCore.tagline}"_` : '',
          '',
          `📍 ${shopCore.city}, ${shopCore.provinsi}`,
          `🕐 ${openStatus}`,
          '',
          `📊 **Shop Stats:**`,
          `  ✅ Successful transactions: ${shopStats.totalTxSuccess.toLocaleString('id-ID')}`,
          `  📦 Products sold: ${shopStats.productSoldFmt}`,
          `  ❤️ Favorites: ${favoriteData.totalFavorite.toLocaleString('id-ID')}`,
          `  🗂 Showcases: ${shopStats.totalShowcase}`,
        ];

        if (shopCore.description) {
          lines.push('', `📝 **About:**`);
          lines.push(truncate(shopCore.description, 400));
        }

        lines.push('', `🔗 ${shopCore.url}`);

        const text = lines.filter((l) => l !== undefined).join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );

  // ── get_shop_products ────────────────────────────────────────────────────────
  server.tool(
    'get_shop_products',
    "Browse a shop's product listings on Tokopedia. Returns product names, prices, ratings, and URLs.",
    {
      shopDomain: z
        .string()
        .min(1)
        .describe('Shop domain/slug from the URL, e.g. "apple-authorized-reseller"'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      perPage: z.number().int().min(1).max(80).default(20).describe('Results per page (default: 20)'),
      sort: z
        .union([
          z.literal(1), // Default
          z.literal(2), // Newest
          z.literal(3), // Best selling
          z.literal(4), // Price low-high
          z.literal(5), // Price high-low
        ])
        .optional()
        .describe('Sort: 1=default, 2=newest, 3=best selling, 4=price low→high, 5=price high→low'),
    },
    async ({ shopDomain, page, perPage, sort }) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key('shop_products', shopDomain, page, perPage, sort);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const data = await gqlRequest<ShopProductsResponse>(
          'ShopProductQuery',
          SHOP_PRODUCTS_QUERY,
          {
            shopDomain,
            filter: {
              page: page ?? 1,
              perPage: perPage ?? 20,
              freeOngkir: false,
              orderby: sort ?? 1,
            },
          }
        );

        const result = data.data.GetShopProduct;
        const products = result.data ?? [];
        const total = result.totalData ?? 0;

        if (products.length === 0) {
          return {
            content: [{ type: 'text', text: `No products found in shop "${shopDomain}".` }],
          };
        }

        const currentPage = page ?? 1;
        const itemsPerPage = perPage ?? 20;
        const totalPages = Math.ceil(total / itemsPerPage);

        const lines: string[] = [
          `🏪 Products from **${shopDomain}**`,
          `📊 ${total.toLocaleString('id-ID')} total products | Page ${currentPage}/${totalPages}`,
          '',
        ];

        products.forEach((p, i) => {
          const freeShip = p.product_label.is_free_ongkir ? ' 🚚' : '';
          const isNew = p.product_label.is_new_product ? ' 🆕' : '';
          lines.push(`${(currentPage - 1) * itemsPerPage + i + 1}. **${p.product_name}**${isNew}`);
          lines.push(`   💰 ${p.product_price_format}${freeShip}`);
          lines.push(`   ⭐ ${p.product_rating_average}/5 | Sold: ${p.product_sold_count}`);
          lines.push(`   🔗 ${p.product_url}`);
          if (i < products.length - 1) lines.push('');
        });

        if (currentPage < totalPages) {
          lines.push('', `📄 Use page=${currentPage + 1} for more results.`);
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );
}
