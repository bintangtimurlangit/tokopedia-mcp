import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { cache } from '../utils/cache.js';
import { withErrorHandling } from '../utils/errors.js';
import type { FilterSortResponse } from '../api/types.js';

const FILTER_SORT_QUERY = `
query FilterSortProductQuery($params: String!) {
  filter_sort_product(params: $params) {
    data {
      filter {
        title
        template_name
        options {
          name
          key
          value
          inputType
          totalData
          isPopular
          isNew
          child {
            key
            value
            name
            inputType
            totalData
            isPopular
          }
        }
      }
      sort {
        name
        key
        value
        inputType
        applyFilter
      }
    }
  }
}
`;

export function registerFilterTools(server: McpServer): void {
  server.tool(
    'get_filters_and_sorts',
    'Get available filter options and sort orders for a Tokopedia product search query. Call this to discover valid location IDs, category IDs, and other filter values before calling search_products.',
    {
      query: z.string().min(1).describe('The search query to get filters for'),
    },
    async ({ query }) => {
      return withErrorHandling(async () => {
        const cacheKey = cache.key('filters', query);
        const cached = cache.get<string>(cacheKey);
        if (cached) return { content: [{ type: 'text', text: cached }] };

        const params = new URLSearchParams({
          navsource: '',
          q: query,
          source: 'search_product',
          st: 'product',
          user_addressId: '',
          user_cityId: '',
          user_districtId: '',
          user_lat: '',
          user_long: '',
          user_postCode: '',
          user_warehouseId: '',
          warehouses: '',
        }).toString();

        const data = await gqlRequest<FilterSortResponse>(
          'FilterSortProductQuery',
          FILTER_SORT_QUERY,
          { params }
        );

        const { filter, sort } = data.data.filter_sort_product.data;

        const lines: string[] = [
          `🔧 Available Filters & Sorts for "${query}"`,
          '',
          '## Sort Options',
        ];

        sort.forEach((s) => {
          lines.push(`  • **${s.name}** — use \`orderBy: ${s.value}\``);
        });

        lines.push('', '## Filter Options');
        filter.forEach((f) => {
          lines.push(``, `### ${f.title}`);
          const popular = f.options.filter((o) => o.isPopular);
          const rest = f.options.filter((o) => !o.isPopular).slice(0, 10);
          const shown = popular.length > 0 ? popular : rest;

          shown.forEach((o) => {
            const count = o.totalData > 0 ? ` (${o.totalData.toLocaleString('id-ID')} products)` : '';
            const badge = o.isNew ? ' 🆕' : o.isPopular ? ' 🔥' : '';
            lines.push(`  • **${o.name}**${badge}${count} — \`${o.key}=${o.value}\``);

            if (o.child && o.child.length > 0) {
              o.child.slice(0, 5).forEach((c) => {
                lines.push(`    └ ${c.name} — \`${c.key}=${c.value}\``);
              });
            }
          });

          if (f.options.length > shown.length) {
            lines.push(`  _(+${f.options.length - shown.length} more options)_`);
          }
        });

        const text = lines.join('\n');
        cache.set(cacheKey, text);
        return { content: [{ type: 'text', text }] };
      });
    }
  );
}
