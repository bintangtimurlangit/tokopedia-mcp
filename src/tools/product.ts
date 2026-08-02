import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';
import { loadProductPage, findBasicInfo } from '../api/productPage.js';
import {
  extractBreadcrumb,
  extractDescription,
  extractMedia,
  extractSpecs,
} from '../api/productExtras.js';

interface PdpBasicInfo {
  productID?: string;
  shopID?: string;
  shopName?: string;
  minOrder?: number;
  maxOrder?: number;
  weight?: number;
  weightUnit?: string;
  condition?: string;
  status?: string;
  url?: string;
  category?: { name?: string };
}

interface PdpStats {
  countView?: string;
  countReview?: string;
  countTalk?: string;
  rating?: number;
}

interface PdpTxStats {
  countSold?: string;
  itemSoldFmt?: string;
}

export function registerProductTools(server: McpServer): void {
  server.tool(
    'get_product_detail',
    'Get product details from a Tokopedia product page: name, price, condition, weight, seller, rating, review/sold counts, and the numeric product ID (use it with get_product_reviews). Provide the product URL, or the shop domain + product key.',
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

        const cacheKey = cache.key('product', pageUrl);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const { cacheObj, meta } = await loadProductPage(pageUrl);

        const rawTitle = meta['og:title'] ?? '';
        const priceFmt = meta['twitter:data1'];
        const priceAmount = meta['product:price:amount'];
        const image = meta['og:image'];
        const location = meta['twitter:data2'];
        const description = meta['og:description'];

        let basic: PdpBasicInfo = {};
        let stats: PdpStats = {};
        let txStats: PdpTxStats = {};
        if (cacheObj) {
          const bi = findBasicInfo(cacheObj);
          if (bi) {
            basic = bi.data as PdpBasicInfo;
            const refStats = cacheObj[`$${bi.key}.stats`] as PdpStats | undefined;
            if (refStats) stats = refStats;
            const refTx = cacheObj[`$${bi.key}.txStats`] as PdpTxStats | undefined;
            if (refTx) txStats = refTx;
          }
        }

        if (!rawTitle && !basic.productID) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Could not read product data from that page. Double-check the URL points to a live Tokopedia product.',
              },
            ],
          };
        }

        // og:title is "<product name> di <shop> | Tokopedia". The site suffix has
        // to come off first, otherwise the shop-suffix check never matches and
        // the name keeps a trailing "di <shop> | Tokopedia".
        let name = rawTitle.replace(/\s*\|\s*Tokopedia\s*$/i, '');
        if (basic.shopName && name.endsWith(` di ${basic.shopName}`)) {
          name = name.slice(0, -` di ${basic.shopName}`.length);
        }

        const conditionLabel =
          basic.condition === 'NEW'
            ? 'New'
            : basic.condition === 'USED'
              ? 'Used'
              : basic.condition || 'Unknown';
        const price =
          priceFmt || (priceAmount ? `Rp${Number(priceAmount).toLocaleString('id-ID')}` : 'N/A');

        const lines: string[] = [
          `📦 **${name || 'Product'}**`,
          '',
          `💰 **Price:** ${price}`,
          '',
          `📊 **Stats:**`,
          `  ⭐ Rating: ${stats.rating ?? 'N/A'}${stats.countReview ? ` (${Number(stats.countReview).toLocaleString('id-ID')} reviews)` : ''}`,
          stats.countTalk
            ? `  💬 Discussions: ${Number(stats.countTalk).toLocaleString('id-ID')}`
            : '',
          stats.countView ? `  👁 Views: ${Number(stats.countView).toLocaleString('id-ID')}` : '',
          `  ✅ Sold: ${txStats.itemSoldFmt ?? txStats.countSold ?? '0'}`,
          '',
          `📋 **Details:**`,
          `  🏷 Condition: ${conditionLabel}`,
          basic.weight ? `  ⚖ Weight: ${basic.weight} ${basic.weightUnit ?? ''}`.trimEnd() : '',
          basic.minOrder ? `  📦 Min Order: ${basic.minOrder}` : '',
          basic.status
            ? `  📶 Status: ${basic.status === 'ACTIVE' ? 'Available' : basic.status}`
            : '',
          `  🏪 Shop: ${basic.shopName ?? 'Unknown'}`,
          location ? `  📍 Location: ${location}` : '',
          basic.productID
            ? `  🆔 Product ID: \`${basic.productID}\` (use with get_product_reviews)`
            : '',
        ].filter((l) => l !== '');

        // Everything below comes from the same page response — no extra fetch.
        const breadcrumb = extractBreadcrumb(cacheObj ?? {});
        if (breadcrumb.length > 0) {
          lines.push('', `🗂 **Category:** ${breadcrumb.map((c) => c.name).join(' → ')}`);
          lines.push(`   🔗 ${breadcrumb[breadcrumb.length - 1].url}`);
        }

        const specs = extractSpecs(cacheObj ?? {});
        // "Kondisi"/"Pemesanan Minimum" already appear under Details above.
        const extraSpecs = specs.filter(
          (s) => !/^(kondisi|pemesanan minimum|kategori)$/i.test(s.title),
        );
        if (extraSpecs.length > 0) {
          lines.push('', '📑 **Specs:**');
          for (const s of extraSpecs) lines.push(`  • ${s.title}: ${s.value}`);
        }

        // The seller's real description — og:description is a truncated summary,
        // so size charts and material specs only exist in the page cache.
        const fullDescription = extractDescription(cacheObj ?? {}) ?? description;
        if (fullDescription) {
          lines.push('', '📝 **Description:**', truncate(fullDescription, 2000));
        }

        const media = extractMedia(cacheObj ?? {});
        if (media.length > 0) {
          const images = media.filter((m) => m.type !== 'video' && m.url);
          const videos = media.filter((m) => m.type === 'video' || m.videoUrl);
          lines.push('', `🖼 **Media** (${media.length}):`);
          for (const m of images.slice(0, 10)) lines.push(`  • ${m.url}`);
          for (const v of videos.slice(0, 3)) lines.push(`  🎬 ${v.videoUrl || v.url}`);
          if (images.length > 10) lines.push(`  … and ${images.length - 10} more images`);
        } else if (image) {
          lines.push('', `🖼 ${image}`);
        }

        lines.push('', `🔗 ${basic.url ?? pageUrl}`);
        lines.push(
          '💡 Related tools: get_product_variants, get_product_rating_summary, get_product_promo.',
        );

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );
}
