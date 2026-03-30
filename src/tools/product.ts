import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';

// Tokopedia product detail uses a layout-based API
const PDP_QUERY = `
query PDPGetLayout($shopDomain: String, $productKey: String, $layoutID: String, $apiVersion: Float, $userAddressID: String, $tokonow: pdpTokoNow!, $extParam: String) {
  pdpGetLayout(input: {shopDomain: $shopDomain, productKey: $productKey, layoutID: $layoutID, apiVersion: $apiVersion, userAddressID: $userAddressID, tokonow: $tokonow, extParam: $extParam}) {
    requestID
    name
    basicInfo {
      id: id_str
      alias
      shopID: shopID_str
      shopName
      minOrder
      maxOrder
      weight
      weightUnit
      condition
      status
      url
      needPrescription
      catalogID: catalogID_str
      isLeasing
      isBlacklisted
      isPowerMerchant
      isTokoNow
      pdpSession
      txStats {
        transactionSuccess
        transactionReject
        countSold
        paymentVerified
        itemSoldPaymentVerified
      }
      stats {
        countView
        countReview
        countTalk
        rating
      }
    }
    components {
      name
      type
      position
      data {
        ... on pdpDataProductContent {
          name
          price {
            value
            currency
            priceFmt
            slashPriceFmt
            discPercentage
            isNegotiate
            isPriceMasked
          }
          campaign {
            campaignID: campaignID_str
            campaignType
            campaignTypeName
            isAppsOnly
            discountedPrice
            originalPrice
          }
          stock {
            useStock
            value
            stockWording
            isSeverity
          }
          variant {
            products {
              productID: productID_str
              isActive
              price
              priceFmt
              optionID
              optionName
              isPrimary
            }
          }
        }
        ... on pdpDataSocialProof {
          row {
            icon
            title
            subtitle
            applink
            type
          }
        }
        ... on pdpDataProductDescription {
          description
          wiki {
            title
            content
          }
        }
        ... on pdpDataProductMedia {
          media {
            type
            urlOriginal: URLOriginal
            urlThumbnail: URLThumbnail
            description
          }
        }
        ... on pdpDataShipment {
          isAvailable
        }
        ... on pdpDataProductSpecification {
          content {
            title
            rows {
              title
              value
            }
          }
        }
      }
    }
  }
}
`;

interface PdpResponse {
  data: {
    pdpGetLayout: {
      requestID: string;
      name: string;
      basicInfo: {
        id: string;
        alias: string;
        shopID: string;
        shopName: string;
        minOrder: number;
        maxOrder: number;
        weight: number;
        weightUnit: string;
        condition: number;
        status: number;
        url: string;
        txStats: {
          transactionSuccess: number;
          countSold: number;
        };
        stats: {
          countView: number;
          countReview: number;
          countTalk: number;
          rating: string;
        };
      };
      components: Array<{
        name: string;
        type: string;
        data: unknown[];
      }>;
    };
  };
}

export function registerProductTools(server: McpServer): void {
  server.tool(
    'get_product_detail',
    'Get full product details from Tokopedia including price, description, specs, variants, stock, ratings, and seller info. Provide the product URL or the shop domain + product key.',
    {
      url: z
        .string()
        .url()
        .optional()
        .describe(
          'Full Tokopedia product URL, e.g. https://www.tokopedia.com/shop-name/product-name'
        ),
      shopDomain: z
        .string()
        .optional()
        .describe('Shop domain/slug, e.g. "dell-official"'),
      productKey: z
        .string()
        .optional()
        .describe('Product key/slug from the URL, e.g. "dell-xps-15-9520"'),
    },
    async ({ url, shopDomain, productKey }) => {
      return withErrorHandling(async () => {
        // Parse URL if provided
        let domain = shopDomain;
        let key = productKey;

        if (url && !domain && !key) {
          const parsed = new URL(url);
          const parts = parsed.pathname.replace(/^\//, '').split('/');
          if (parts.length >= 2) {
            domain = parts[0];
            key = parts[1];
          }
        }

        if (!domain || !key) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Please provide either a full product `url` or both `shopDomain` and `productKey`.',
              },
            ],
          };
        }

        const cacheKey = cache.key('product', domain, key);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const data = await gqlRequest<PdpResponse>('PDPGetLayout', PDP_QUERY, {
          shopDomain: domain,
          productKey: key,
          layoutID: '',
          apiVersion: 1,
          userAddressID: '',
          tokonow: {
            isTokoNow: false,
            whID: '0',
            serviceType: '',
          },
          extParam: '',
        });

        const layout = data.data.pdpGetLayout;
        const info = layout.basicInfo;

        // Extract component data
        let price: { priceFmt?: string; slashPriceFmt?: string; discPercentage?: string } = {};
        let description = '';
        let mediaList: Array<{ type: string; urlOriginal: string; urlThumbnail: string }> = [];
        let specs: Array<{ title: string; rows: Array<{ title: string; value: string }> }> = [];
        let stock: { value?: number; stockWording?: string } = {};
        let variants: Array<{ productID: string; price: number; priceFmt: string; optionName: string }> = [];
        let socialProof: Array<{ title: string; subtitle: string }> = [];

        for (const comp of layout.components) {
          for (const d of comp.data) {
            const item = d as Record<string, unknown>;
            if (comp.name === 'product_content' && item['price']) {
              price = item['price'] as typeof price;
              stock = (item['stock'] ?? {}) as typeof stock;
              const variantData = item['variant'] as { products?: typeof variants } | undefined;
              variants = variantData?.products ?? [];
            }
            if (comp.name === 'product_detail' && item['description']) {
              description = item['description'] as string;
            }
            if (comp.name === 'product_media' && item['media']) {
              mediaList = item['media'] as typeof mediaList;
            }
            if (comp.name === 'product_specification' && item['content']) {
              specs = item['content'] as typeof specs;
            }
            if (comp.name === 'social_proof' && item['row']) {
              socialProof = item['row'] as typeof socialProof;
            }
          }
        }

        const conditionLabel = info.condition === 1 ? 'New' : info.condition === 2 ? 'Used' : 'Unknown';
        const discount = price.discPercentage && price.discPercentage !== '0%'
          ? ` (${price.discPercentage} OFF)`
          : '';

        const lines: string[] = [
          `📦 **${layout.name}**`,
          ``,
          `💰 **Price:** ${price.priceFmt ?? 'N/A'}${discount}`,
          price.slashPriceFmt ? `   ~~${price.slashPriceFmt}~~ (original)` : '',
          ``,
          `📊 **Stats:**`,
          `  ⭐ Rating: ${info.stats.rating} (${info.stats.countReview.toLocaleString('id-ID')} reviews)`,
          `  💬 Discussions: ${info.stats.countTalk.toLocaleString('id-ID')}`,
          `  👁 Views: ${info.stats.countView.toLocaleString('id-ID')}`,
          `  ✅ Sold: ${info.txStats.countSold.toLocaleString('id-ID')}`,
          ``,
          `📋 **Details:**`,
          `  🏷 Condition: ${conditionLabel}`,
          `  ⚖ Weight: ${info.weight} ${info.weightUnit}`,
          `  📦 Min Order: ${info.minOrder}`,
          `  🏪 Shop: ${info.shopName}`,
          stock.stockWording ? `  📦 Stock: ${stock.stockWording}` : '',
        ].filter((l) => l !== '');

        if (socialProof.length > 0) {
          lines.push('', '🔖 **Highlights:**');
          socialProof.forEach((s) => {
            lines.push(`  • ${s.title}${s.subtitle ? ': ' + s.subtitle : ''}`);
          });
        }

        if (variants.length > 0) {
          lines.push('', `🎨 **Variants (${variants.length}):**`);
          variants.slice(0, 8).forEach((v) => {
            lines.push(`  • ${v.optionName} — ${v.priceFmt}`);
          });
          if (variants.length > 8) {
            lines.push(`  _(+${variants.length - 8} more)_`);
          }
        }

        if (specs.length > 0) {
          lines.push('', '📐 **Specifications:**');
          specs.forEach((group) => {
            lines.push(`  **${group.title}:**`);
            group.rows.forEach((r) => {
              lines.push(`    • ${r.title}: ${r.value}`);
            });
          });
        }

        if (description) {
          lines.push('', '📝 **Description:**');
          lines.push(truncate(description.replace(/<[^>]*>/g, '').trim(), 500));
        }

        if (mediaList.length > 0) {
          lines.push('', `🖼 **Images (${mediaList.length}):**`);
          mediaList.slice(0, 3).forEach((m) => {
            lines.push(`  • ${m.urlOriginal}`);
          });
        }

        lines.push('', `🔗 ${info.url}`);

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );
}
