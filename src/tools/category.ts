import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';
import { loadProductPage } from '../api/productPage.js';
import { extractBreadcrumb } from '../api/productExtras.js';
import {
  categoryUrl,
  extractCategoryProducts,
  extractCategorySummary,
  extractCategoryTotal,
  extractCategoryTree,
  extractRecommendations,
  extractRelatedCategories,
  loadCategoryPage,
} from '../api/categoryPage.js';
import type { CategoryNode, CategoryProduct } from '../api/types.js';

/** Render one product line block, shared by browse and similar-products. */
function renderProduct(p: CategoryProduct, index: number): string[] {
  const discount = p.discountPercentage > 0 ? ` (-${p.discountPercentage}%)` : '';
  const slash = p.originalPrice && p.originalPrice !== p.price ? ` ~~${p.originalPrice}~~` : '';
  const badge = p.shopIsOfficial ? ' [Official Store]' : p.shopIsPowerBadge ? ' [Power Store]' : '';
  const rating = p.rating > 0 ? `⭐ ${p.rating}` : '⭐ N/A';
  const reviews = p.reviewCount > 0 ? ` (${p.reviewCount.toLocaleString('id-ID')})` : '';
  const preorder = p.isPreorder ? ' | 🕒 Preorder' : '';

  return [
    `${index}. **${p.name}**`,
    `   💰 ${p.price}${slash}${discount}`,
    `   ${rating}${reviews} | 🏪 ${p.shopName}${badge}${p.shopLocation ? ` (${p.shopLocation})` : ''} | 🆔 ${p.id}${preorder}`,
    `   🔗 ${p.url}`,
  ];
}

function renderTree(nodes: CategoryNode[], indent = ''): string[] {
  const lines: string[] = [];
  for (const n of nodes) {
    lines.push(`${indent}• **${n.name}**${n.id ? ` \`${n.id}\`` : ''}`);
    if (n.url) lines.push(`${indent}  ${n.url}`);
    if (n.children.length > 0) lines.push(...renderTree(n.children, indent + '   '));
  }
  return lines;
}

export function registerCategoryTools(server: McpServer): void {
  server.tool(
    'browse_category',
    "Browse a Tokopedia category's product listing without a search keyword — the same grid a shopper sees on a category page, plus the category's total product count and its related categories. Use this when the user wants to explore a category rather than search for a term. Accepts a category path (\"fashion-pria/atasan-pria/kaos-pria\"), an identifier, or a full category URL — get_product_detail's breadcrumb links give you these.",
    {
      category: z
        .string()
        .min(1)
        .describe(
          'Category path, identifier, or full URL. E.g. "fashion-pria/atasan-pria/kaos-pria", "fashion-pria_atasan-pria_kaos-pria", or "https://www.tokopedia.com/p/fashion-pria/atasan-pria/kaos-pria".',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(60)
        .default(20)
        .describe('How many products to return, 1-60 (default: 20)'),
    },
    async ({ category, limit }) => {
      return withErrorHandling(async () => {
        const pageUrl = categoryUrl(category);
        const cacheKey = cache.key('browseCategory', pageUrl, limit);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const { cacheObj } = await loadCategoryPage(pageUrl);
        if (!cacheObj) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Could not read category data from ${pageUrl}. Double-check the category path — get_product_detail's breadcrumb gives valid ones.`,
              },
            ],
          };
        }

        const products = extractCategoryProducts(cacheObj);
        if (products.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No products found at ${pageUrl}. The path may not be a real category.`,
              },
            ],
          };
        }

        const summary = extractCategorySummary(cacheObj);
        const total = extractCategoryTotal(cacheObj);
        const shown = products.slice(0, limit);

        const lines: string[] = [`🗂 **${summary?.name ?? 'Category'}**`];
        if (summary?.id) lines.push(`🆔 Category ID: \`${summary.id}\``);
        if (total > 0) {
          lines.push(`📊 ${total.toLocaleString('id-ID')} products in this category`);
        }
        if (summary?.description) {
          lines.push('', truncate(summary.description, 300));
        }

        lines.push('', `📦 **Showing ${shown.length} of ${products.length} on this page:**`, '');
        shown.forEach((p, i) => {
          lines.push(...renderProduct(p, i + 1));
          if (i < shown.length - 1) lines.push('');
        });

        const related = extractRelatedCategories(cacheObj).filter((c) => c.id !== summary?.id);
        if (related.length > 0) {
          lines.push('', '🔀 **Related categories:**');
          for (const c of related) lines.push(`  • ${c.name} \`${c.id}\` — ${c.url}`);
        }

        if (summary?.id) {
          lines.push(
            '',
            `💡 For sorting, price ranges, or paging past ${products.length} results, use search_products with \`filters: {"sc":"${summary.id}"}\`.`,
          );
        }

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );

  server.tool(
    'get_similar_products',
    "Find products similar to a given Tokopedia product — Tokopedia's own recommendations for the product's category, useful for comparing alternatives or finding a cheaper equivalent. Provide the product URL, or the shop domain + product key.",
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
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('How many suggestions to return, 1-20 (default: 10)'),
    },
    async ({ url, shopDomain, productKey, limit }) => {
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

        const cacheKey = cache.key('similarProducts', pageUrl, limit);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        // The product page gives us the category; the category page carries the
        // recommendations. The product page is usually already cached by an
        // earlier get_product_detail call, so this is often one extra fetch.
        const { cacheObj: productCache } = await loadProductPage(pageUrl);
        if (!productCache) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Could not read product data from that page. Double-check the URL points to a live Tokopedia product.',
              },
            ],
          };
        }

        const breadcrumb = extractBreadcrumb(productCache);
        if (breadcrumb.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: "⚠️ This product has no category breadcrumb, so there's nothing to base suggestions on. Try search_products with the product name instead.",
              },
            ],
          };
        }

        const leaf = breadcrumb[breadcrumb.length - 1];
        const { cacheObj: categoryCache } = await loadCategoryPage(leaf.url);
        if (!categoryCache) {
          return {
            content: [
              { type: 'text', text: `❌ Could not read the category page at ${leaf.url}.` },
            ],
          };
        }

        // Recommendations are the closest thing to "similar"; fall back to the
        // category grid so the tool still answers when they're absent.
        let source = 'recommendations';
        let candidates = extractRecommendations(categoryCache);
        if (candidates.length === 0) {
          source = 'category listing';
          candidates = extractCategoryProducts(categoryCache);
        }

        if (candidates.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `ℹ️ No similar products available for "${leaf.name}" right now.`,
              },
            ],
          };
        }

        const shown = candidates.slice(0, limit);
        const lines: string[] = [
          `🔎 **Similar products** in ${breadcrumb.map((c) => c.name).join(' → ')}`,
          `_Source: Tokopedia ${source}_`,
          '',
        ];
        shown.forEach((p, i) => {
          lines.push(...renderProduct(p, i + 1));
          if (i < shown.length - 1) lines.push('');
        });
        lines.push('', `💡 Browse the whole category with browse_category "${leaf.url}".`);

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );

  server.tool(
    'get_category_tree',
    "List Tokopedia's category taxonomy — top-level categories and their sub-categories, with the numeric category IDs and browse URLs. Use it to discover valid categories for browse_category, or the `sc` filter value for search_products. Optionally filter to one top-level category by name.",
    {
      category: z
        .string()
        .optional()
        .describe(
          'Optional: only show this top-level category, matched loosely by name, e.g. "Elektronik" or "Fashion Pria".',
        ),
    },
    async ({ category }) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key('categoryTree', category ?? 'all');
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        // The `/p/` index ships the full taxonomy; a specific category page only
        // carries its own branch, so always read the index here.
        const { cacheObj } = await loadCategoryPage('');
        if (!cacheObj) {
          return {
            content: [{ type: 'text', text: '❌ Could not read the Tokopedia category index.' }],
          };
        }

        let roots = extractCategoryTree(cacheObj);
        if (roots.length === 0) {
          return {
            content: [
              { type: 'text', text: '❌ Could not extract the category tree from the page.' },
            ],
          };
        }

        if (category) {
          const needle = category.toLowerCase();
          const matched = roots.filter((r) => r.name.toLowerCase().includes(needle));
          if (matched.length === 0) {
            const names = roots.map((r) => r.name).join(', ');
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ No top-level category matching "${category}".\n\nAvailable: ${names}`,
                },
              ],
            };
          }
          roots = matched;
        }

        const total = roots.reduce((n, r) => n + 1 + r.children.length, 0);
        const lines: string[] = [
          '🗂 **Tokopedia Categories**',
          `📊 ${roots.length} top-level, ${total} entries shown`,
          '',
          ...renderTree(roots),
          '',
          '💡 Use a category URL with browse_category, or its ID as `filters: {"sc":"<id>"}` in search_products.',
        ];

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );
}
