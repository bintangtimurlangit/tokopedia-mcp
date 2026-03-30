import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling } from '../utils/errors.js';

interface WishlistItem {
  id: string;
  name: string;
  url: string;
  image_url: string;
  price: number;
  price_fmt: string;
  available: boolean;
  rating: string;
  sold_count: number;
  original_price?: number;
  original_price_fmt?: string;
  discount_percentage?: number;
  label_stock?: string;
  wishlist_id: string;
  variant_name?: string;
  shop: {
    id: string;
    name: string;
    url: string;
    location: string;
  };
  badges: Array<{ title: string; image_url: string }>;
  bebas_ongkir?: { type: string; title: string };
}

interface WishlistCollectionItemsData {
  get_wishlist_collection_items: {
    items: WishlistItem[];
    total_data: number;
    has_next_page: boolean;
    header_title: string;
  };
}

interface WishlistAddData {
  addWishlist: {
    success: boolean;
    message: string;
    wishlist_id: string;
  };
}

interface WishlistBulkRemoveData {
  wishlist_bulk_remove_v2: {
    success: boolean;
    message: string;
  };
}

const GET_WISHLIST_QUERY = `
query GetWishlistCollectionItems($params: GetWishlistCollectionItemsParams) {
  get_wishlist_collection_items(params: $params) {
    header_title
    has_next_page
    total_data
    items {
      id
      name
      url
      image_url
      price
      price_fmt
      available
      rating
      sold_count
      original_price
      original_price_fmt
      discount_percentage
      label_stock
      wishlist_id
      variant_name
      shop {
        id
        name
        url
        location
      }
      badges {
        title
        image_url
      }
      bebas_ongkir {
        type
        title
      }
    }
  }
}
`;

const ADD_WISHLIST_MUTATION = `
mutation AddWishlist($productID: String!, $collectionID: String) {
  addWishlist(productID: $productID, collectionID: $collectionID) {
    success
    message
    wishlist_id
  }
}
`;

const BULK_REMOVE_WISHLIST_MUTATION = `
mutation WishlistBulkRemoveV2($params: WishlistBulkRemoveParams!) {
  wishlist_bulk_remove_v2(params: $params) {
    success
    message
  }
}
`;

export function registerWishlistTools(server: McpServer): void {
  server.tool(
    'get_wishlist',
    'Get your Tokopedia wishlist (saved products). Requires TOKO_SID (and related cookies) to be set.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(40).default(20).describe('Items per page, max 40 (default: 20)'),
      collection_id: z.string().default('0').describe('Wishlist collection ID, "0" for all items (default: "0")'),
      query: z.string().optional().describe('Search within wishlist'),
    },
    async ({ page, limit, collection_id, query }) => {
      return withErrorHandling(async () => {
        const currentPage = page ?? 1;
        const itemsPerPage = limit ?? 20;

        const data = await gqlRequest<{ data: WishlistCollectionItemsData }>(
          'GetWishlistCollectionItems',
          GET_WISHLIST_QUERY,
          {
            params: {
              limit: itemsPerPage,
              page: currentPage,
              sort_filters: [],
              query: query ?? '',
              collection_id: collection_id ?? '0',
              in_collection: '',
              source: 'wishlist',
            },
          },
          true
        );

        const result = data.data?.get_wishlist_collection_items;
        if (!result) {
          return {
            content: [{ type: 'text', text: '❌ Failed to retrieve wishlist. Make sure TOKO_SID is set correctly in .env or MCP env.' }],
          };
        }

        const { items, total_data, has_next_page, header_title } = result;

        if (items.length === 0) {
          return { content: [{ type: 'text', text: '❤️ Your wishlist is empty.' }] };
        }

        const offset = (currentPage - 1) * itemsPerPage;
        const lines: string[] = [
          `❤️ **${header_title || 'My Wishlist'}**`,
          `📊 ${total_data.toLocaleString('id-ID')} saved items | Page ${currentPage}`,
          '',
        ];

        items.forEach((item, i) => {
          const discount =
            item.discount_percentage && item.discount_percentage > 0
              ? ` (-${item.discount_percentage}%)`
              : '';
          const freeShip = item.bebas_ongkir ? ' 🚚 Free shipping' : '';
          const unavail = !item.available ? ' ⚠️ Unavailable' : '';
          const badge = item.badges.find((b) => b.title)?.title;
          const badgeStr = badge ? ` [${badge}]` : '';

          lines.push(`${offset + i + 1}. **${item.name}**`);
          lines.push(`   🆔 Wishlist ID: \`${item.wishlist_id}\` | Product ID: \`${item.id}\``);
          lines.push(`   💰 ${item.price_fmt}${discount}${freeShip}${unavail}`);
          if (item.original_price_fmt && item.discount_percentage) {
            lines.push(`   ~~${item.original_price_fmt}~~`);
          }
          lines.push(`   ⭐ ${item.rating || 'N/A'} | 📦 ${item.sold_count.toLocaleString('id-ID')} sold`);
          lines.push(`   🏪 ${item.shop.name}${badgeStr} (${item.shop.location})`);
          if (item.variant_name) lines.push(`   🎨 Variant: ${item.variant_name}`);
          if (item.label_stock) lines.push(`   📊 Stock: ${item.label_stock}`);
          lines.push(`   🔗 ${item.url}`);
          if (i < items.length - 1) lines.push('');
        });

        if (has_next_page) {
          lines.push('', `📄 Use page=${currentPage + 1} for more items.`);
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      });
    }
  );

  server.tool(
    'add_to_wishlist',
    'Add a product to your Tokopedia wishlist by product ID. Requires TOKO_SID. Get the product ID from search_products or get_product_detail.',
    {
      productId: z.string().describe('Product ID to add to wishlist (as string)'),
      collectionId: z.string().optional().describe('Collection ID to add to (leave empty for default collection)'),
    },
    async ({ productId, collectionId }) => {
      return withErrorHandling(async () => {
        const data = await gqlRequest<{ data: WishlistAddData }>(
          'AddWishlist',
          ADD_WISHLIST_MUTATION,
          { productID: productId, collectionID: collectionId ?? '' },
          true
        );

        const result = data.data?.addWishlist;
        if (!result) {
          return { content: [{ type: 'text', text: '❌ Failed to add to wishlist.' }] };
        }

        cache.clear();

        const icon = result.success ? '✅' : '❌';
        return {
          content: [
            {
              type: 'text',
              text: `${icon} ${result.message || (result.success ? 'Product added to wishlist!' : 'Failed to add product.')}`,
            },
          ],
        };
      });
    }
  );

  server.tool(
    'remove_from_wishlist',
    'Remove one or more items from your Tokopedia wishlist. Requires TOKO_SID. Get wishlist_id values from get_wishlist.',
    {
      wishlistIds: z
        .array(z.string())
        .min(1)
        .describe('Array of wishlist item IDs to remove (get wishlist_id field from get_wishlist)'),
    },
    async ({ wishlistIds }) => {
      return withErrorHandling(async () => {
        const data = await gqlRequest<{ data: WishlistBulkRemoveData }>(
          'WishlistBulkRemoveV2',
          BULK_REMOVE_WISHLIST_MUTATION,
          {
            params: {
              source: 'wishlist',
              wishlist_ids: wishlistIds,
            },
          },
          true
        );

        const result = data.data?.wishlist_bulk_remove_v2;
        if (!result) {
          return { content: [{ type: 'text', text: '❌ Failed to remove from wishlist.' }] };
        }

        cache.clear();

        const icon = result.success ? '✅' : '❌';
        const count = wishlistIds.length;
        return {
          content: [
            {
              type: 'text',
              text: `${icon} ${result.message || (result.success ? `${count} item(s) removed from wishlist!` : 'Failed to remove items.')}`,
            },
          ],
        };
      });
    }
  );
}
