import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TokopediaAPIError } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling, truncate } from '../utils/errors.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Tokopedia's product page is server-rendered: the core product data is no
// longer fetched via a client GraphQL call, it is dehydrated into the HTML as
// OpenGraph/Twitter meta tags plus an Apollo cache on `window.__cache`.
// We fetch the page and read those, which is stable across the site's frequent
// GraphQL schema changes.

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

async function fetchProductPage(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  } catch (err) {
    throw new TokopediaAPIError(
      `Network error loading product page: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      'productPage',
    );
  }
  if (!res.ok) {
    throw new TokopediaAPIError(
      `Tokopedia returned HTTP ${res.status} for the product page`,
      res.status,
      'productPage',
    );
  }
  return res.text();
}

function metaContent(html: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)="${key.replace(/[:]/g, '\\:')}"[^>]+content="([^"]*)"`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : undefined;
}

/** Extract the dehydrated Apollo cache (`window.__cache = {...};`). */
function parseCache(html: string): Record<string, unknown> | null {
  const m = html.match(/window\.__cache\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decode(s?: string): string | undefined {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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

        const html = await fetchProductPage(pageUrl);

        const rawTitle = decode(metaContent(html, 'og:title')) ?? '';
        const priceFmt = decode(metaContent(html, 'twitter:data1'));
        const priceAmount = metaContent(html, 'product:price:amount');
        const image = metaContent(html, 'og:image');
        const location = decode(metaContent(html, 'twitter:data2'));
        const description = decode(metaContent(html, 'og:description'));

        const cacheObj = parseCache(html);
        let basic: PdpBasicInfo = {};
        let stats: PdpStats = {};
        let txStats: PdpTxStats = {};
        if (cacheObj) {
          const biKey = Object.keys(cacheObj).find((k) => /^pdpBasicInfo\d+$/.test(k));
          if (biKey) {
            basic = cacheObj[biKey] as PdpBasicInfo;
            stats = (cacheObj[`$${biKey}.stats`] as PdpStats) ?? {};
            txStats = (cacheObj[`$${biKey}.txStats`] as PdpTxStats) ?? {};
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

        // og:title is "<product name> di <shop>" — strip the shop suffix.
        let name = rawTitle;
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

        if (description) {
          lines.push('', '📝 **Description:**', truncate(description, 400));
        }
        if (image) {
          lines.push('', `🖼 ${image}`);
        }
        lines.push('', `🔗 ${basic.url ?? pageUrl}`);

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    },
  );
}
