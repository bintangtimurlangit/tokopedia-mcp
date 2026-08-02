import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cache } from '../utils/cache.js';
import { withErrorHandling } from '../utils/errors.js';
import { loadProductPage, findBasicInfo } from '../api/productPage.js';
import { extractVariants } from '../api/variantExtractor.js';

export function registerVariantTools(server: McpServer): void {
  server.tool(
    'get_product_variants',
    'List the variants (color, size, storage, etc.) of a Tokopedia product, including each option with stock status, by-axis groupings, per-variant price where it differs, and COD availability. Provide the product URL, or the shop domain + product key.',
    {
      url: z
        .string()
        .url()
        .optional()
        .describe(
          'Full Tokopedia product URL, e.g. https://www.tokopedia.com/shop-name/product-name',
        ),
      shopDomain: z.string().optional().describe('Shop domain/slug, e.g. "dell-official"'),
      productKey: z
        .string()
        .optional()
        .describe('Product key/slug from the URL, e.g. "dell-xps-15-9520"'),
    },
    async ({ url, shopDomain, productKey }) => {
      return withErrorHandling(async () => {
        let pageUrl = url;
        if (!pageUrl && shopDomain && productKey) {
          pageUrl = `https://www.tokopedia.com/${shopDomain}/${productKey}`;
        }
        if (!pageUrl) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Please provide either a full product `url` or both `shopDomain` and `productKey`.',
              },
            ],
          };
        }

        const cacheKey = cache.key('variants', pageUrl);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const { cacheObj } = await loadProductPage(pageUrl);

        if (!cacheObj) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Could not read product data from that page. Double-check the URL points to a live Tokopedia product.',
              },
            ],
          };
        }

        // Get product ID from basic info
        let productId = '';
        const bi = findBasicInfo(cacheObj);
        if (bi) {
          productId = String((bi.data as Record<string, unknown>).productID ?? '');
        }

        const variants = extractVariants(cacheObj, productId);

        if (!variants.hasVariants) {
          return {
            content: [
              {
                type: 'text',
                text: 'ℹ️ This product has no selectable variants — a single SKU with no options to choose from.',
              },
            ],
          };
        }

        if (variants.axes.length === 0 && variants.skus.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '⚠️ This product has variants, but the variant data could not be extracted from the page. The page may load variants client-side; try viewing the product URL directly.',
              },
            ],
          };
        }

        const lines: string[] = [];

        // Header
        lines.push('🎨 **Product Variants**');
        lines.push(`🆔 Product ID: \`${variants.productId}\``);
        if (variants.parentId) lines.push(`👪 Parent ID: \`${variants.parentId}\``);

        // Axes section
        if (variants.axes.length > 0) {
          lines.push('');
          lines.push(`📐 **Variation Axes** (${variants.axes.length}):`);
          for (const axis of variants.axes) {
            const typeTag =
              axis.identifier === 'colour' || axis.identifier.toLowerCase().includes('warna')
                ? '🎨'
                : '📏';
            lines.push(`  ${typeTag} **${axis.name}** (${axis.options.length} options):`);

            for (const opt of axis.options) {
              const hexBadge = opt.hexColor ? ` \`${opt.hexColor}\`` : '';
              const stockBadge = opt.stock !== null ? ` [stock: ${opt.stock}]` : '';
              lines.push(`    - ${opt.value}${hexBadge}${stockBadge}`);
            }
          }
        }

        // SKUs section
        if (variants.skus.length > 0) {
          lines.push('');
          const priceNote = variants.priceVariesByVariant ? ' (prices vary by variant)' : '';
          lines.push(`📦 **Variants** (${variants.skus.length} SKUs)${priceNote}:`);

          const MAX_RENDERED_SKUS = 50;
          const rendered = variants.skus.slice(0, MAX_RENDERED_SKUS);
          for (const sku of rendered) {
            const statusIndicator = sku.isBuyable ? '✅' : '❌';
            const discountBadge =
              sku.discountPercentage > 0 ? ` (-${sku.discountPercentage}%)` : '';
            const slashBadge = sku.slashPriceFmt ? ` ~~${sku.slashPriceFmt}~~` : '';
            const stockInfo = sku.stock !== null ? ` | 📦 ${sku.stock}` : '';
            const codBadge = sku.isCod ? ' | 🚛 COD' : '';
            const optionLabel =
              sku.optionNames.length > 0 ? ` — ${sku.optionNames.join(', ')}` : '';

            lines.push(
              `  ${statusIndicator} **${sku.priceFmt}**${discountBadge}${slashBadge}${optionLabel}`,
            );
            lines.push(`     🆔 \`${sku.productId}\`${stockInfo}${codBadge}`);
            lines.push(`     🔗 ${sku.productUrl}`);
          }

          if (variants.skus.length > MAX_RENDERED_SKUS) {
            const remaining = variants.skus.length - MAX_RENDERED_SKUS;
            lines.push(
              `  ⚠️ … and ${remaining} more SKUs not shown (rendering capped at ${MAX_RENDERED_SKUS}). Try a different product listing or narrow by axis values.`,
            );
          }
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );
}
