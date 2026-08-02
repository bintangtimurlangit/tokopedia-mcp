import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cache } from '../utils/cache.js';
import { withErrorHandling } from '../utils/errors.js';
import { loadProductPage, findBasicInfo } from '../api/productPage.js';
import { extractCampaign, extractRatingSummary } from '../api/productExtras.js';

/** Shared argument shape: a product URL, or the shop domain + product key. */
const productLocator = {
  url: z
    .string()
    .url()
    .optional()
    .describe('Full Tokopedia product URL, e.g. https://www.tokopedia.com/shop-name/product-name'),
  shopDomain: z.string().optional().describe('Shop domain/slug, e.g. "dell-official"'),
  productKey: z
    .string()
    .optional()
    .describe('Product key/slug from the URL, e.g. "dell-xps-15-9520"'),
};

function resolveUrl(url?: string, shopDomain?: string, productKey?: string): string | null {
  if (url) return url;
  if (shopDomain && productKey) return `https://www.tokopedia.com/${shopDomain}/${productKey}`;
  return null;
}

const MISSING_LOCATOR =
  '❌ Please provide either a full product `url` or both `shopDomain` and `productKey`.';

const UNREADABLE =
  '❌ Could not read product data from that page. Double-check the URL points to a live Tokopedia product.';

/** Render an integer count as a small proportional bar for quick scanning. */
function bar(percentage: number, width = 20): string {
  const filled = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function rupiah(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`;
}

export function registerInsightTools(server: McpServer): void {
  server.tool(
    'get_product_rating_summary',
    "Get a product's rating breakdown (how many 5★, 4★, … 1★ reviews) plus Tokopedia's aggregated review topics and satisfaction percentage. Use this to judge a product's reception quickly instead of paging through get_product_reviews. Provide the product URL, or the shop domain + product key.",
    productLocator,
    async ({ url, shopDomain, productKey }) => {
      return withErrorHandling(async () => {
        const pageUrl = resolveUrl(url, shopDomain, productKey);
        if (!pageUrl) return { content: [{ type: 'text', text: MISSING_LOCATOR }] };

        const cacheKey = cache.key('ratingSummary', pageUrl);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const { cacheObj } = await loadProductPage(pageUrl);
        if (!cacheObj) return { content: [{ type: 'text', text: UNREADABLE }] };

        const summary = extractRatingSummary(cacheObj);
        if (!summary) {
          return {
            content: [
              {
                type: 'text',
                text: 'ℹ️ No rating data on this product page — it likely has no reviews yet.',
              },
            ],
          };
        }

        const bi = findBasicInfo(cacheObj);
        const productId = bi ? String((bi.data as Record<string, unknown>).productID ?? '') : '';

        const lines: string[] = ['⭐ **Rating Summary**'];
        if (productId) lines.push(`🆔 Product ID: \`${productId}\``);
        lines.push('');
        lines.push(
          `📊 **${summary.ratingScore || 'N/A'}** from ${summary.totalRating.toLocaleString('id-ID')} rating(s)`,
        );
        if (summary.satisfactionText) lines.push(`😊 ${summary.satisfactionText}`);
        if (summary.totalRatingWithImage > 0) {
          lines.push(`📷 ${summary.totalRatingWithImage.toLocaleString('id-ID')} include a photo`);
        }

        if (summary.breakdown.length > 0) {
          lines.push('', '**Distribution:**');
          // Highest star first, which is how Tokopedia displays it.
          for (const row of [...summary.breakdown].sort((a, b) => b.rate - a.rate)) {
            lines.push(
              `  ${row.rate}★ ${bar(row.percentage)} ${row.totalReviews.toLocaleString('id-ID')} (${Math.round(row.percentage)}%)`,
            );
          }
        }

        if (summary.topics.length > 0) {
          lines.push('', '**What reviewers mention:**');
          for (const t of summary.topics) {
            lines.push(
              `  • ${t.label} — ${t.rating.toFixed(1)}★ across ${t.reviewCount.toLocaleString('id-ID')} review(s)`,
            );
          }
        }

        if (productId) {
          lines.push('', `💡 Use get_product_reviews with \`${productId}\` to read the reviews.`);
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );

  server.tool(
    'get_product_promo',
    "Check whether a product is in a running Tokopedia campaign (flash sale, Guncang, etc.): the campaign name, discount percentage, original vs campaign price, how much of the campaign stock is sold, and when it ends. Use this to tell a genuine time-limited discount from a product's normal price. Provide the product URL, or the shop domain + product key.",
    productLocator,
    async ({ url, shopDomain, productKey }) => {
      return withErrorHandling(async () => {
        const pageUrl = resolveUrl(url, shopDomain, productKey);
        if (!pageUrl) return { content: [{ type: 'text', text: MISSING_LOCATOR }] };

        const cacheKey = cache.key('promo', pageUrl);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const { cacheObj } = await loadProductPage(pageUrl);
        if (!cacheObj) return { content: [{ type: 'text', text: UNREADABLE }] };

        const promo = extractCampaign(cacheObj);
        if (!promo) {
          return {
            content: [
              {
                type: 'text',
                text: 'ℹ️ No campaign running on this product — the listed price is its normal price.',
              },
            ],
          };
        }

        const saving = promo.originalPrice - promo.discountedPrice;
        const lines: string[] = [
          `🔥 **${promo.campaignName || 'Campaign'}**${promo.isActive ? '' : ' _(not currently active)_'}`,
        ];
        if (promo.thematicName) lines.push(`🏷 ${promo.thematicName}`);
        lines.push('');
        lines.push(
          `💰 **${rupiah(promo.discountedPrice)}** ~~${rupiah(promo.originalPrice)}~~ (-${promo.discountPercentage}%)`,
        );
        if (saving > 0) lines.push(`   You save ${rupiah(saving)}`);
        if (promo.cashbackPercentage > 0) {
          lines.push(`   💸 Cashback: ${promo.cashbackPercentage}%`);
        }

        lines.push('', '📦 **Campaign stock:**');
        lines.push(
          `  ${bar(promo.stockSoldPercentage)} ${promo.stockSoldPercentage}% sold` +
            (promo.stock > 0 ? ` | ${promo.stock} left` : ''),
        );

        if (promo.startDate || promo.endDate) {
          lines.push('', '🗓 **Window:**');
          if (promo.startDate) lines.push(`  Starts: ${promo.startDate}`);
          if (promo.endDate) lines.push(`  Ends:   ${promo.endDate}`);
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );
}
