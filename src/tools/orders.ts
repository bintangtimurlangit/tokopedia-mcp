import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gqlRequest } from '../api/client.js';
import { withErrorHandling } from '../utils/errors.js';
import type { OrderHistoryResponse, OrderStatus } from '../api/types.js';

const ORDER_HISTORY_QUERY = `
query GetOrderHistory(
  $VerticalCategory: String!
  $Status: String!
  $SearchableText: String!
  $CreateTimeStart: String!
  $CreateTimeEnd: String!
  $Page: Int!
  $Limit: Int!
) {
  uohOrders(input: {
    UUID: ""
    VerticalID: ""
    VerticalCategory: $VerticalCategory
    Status: $Status
    SearchableText: $SearchableText
    CreateTime: ""
    CreateTimeStart: $CreateTimeStart
    CreateTimeEnd: $CreateTimeEnd
    Page: $Page
    Limit: $Limit
    SortBy: ""
    IsSortAsc: false
  }) {
    orders {
      orderUUID
      verticalID
      verticalCategory
      status
      verticalStatus
      metadata {
        upstream
        verticalLabel
        paymentDateStr
        detailURL { webURL }
        status { label textColor bgColor }
        products {
          title
          imageURL
          inline1 { label textColor }
          inline2 { label textColor }
        }
        totalPrice { value label }
        buttons { Label type actionType webURL }
      }
      createTime
      updateTime
    }
    totalOrders
    dateLimit
    filtersV2 { label value isPrimary }
  }
}
`;

const STATUS_MAP: Record<string, string> = {
  all: '',
  payment: 'payment',
  processed: 'processed',
  shipped: 'shipped',
  delivered: 'delivered',
  done: 'done',
  cancelled: 'cancelled',
};

export function registerOrderTools(server: McpServer): void {
  server.tool(
    'get_order_history',
    'Get your Tokopedia order history. Requires TOKO_SID to be set. Supports filtering by status and date range.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Orders per page, max 50 (default: 10)'),
      status: z
        .enum(['all', 'payment', 'processed', 'shipped', 'delivered', 'done', 'cancelled'])
        .default('all')
        .describe('Filter by order status'),
      verticalCategory: z
        .string()
        .optional()
        .describe(
          'Filter by vertical category, e.g. "PHYSICAL_GOODS", "DIGITAL_GOODS", "TRAVEL"'
        ),
      search: z
        .string()
        .optional()
        .describe('Search within orders by product name or shop name'),
      dateStart: z
        .string()
        .optional()
        .describe('Filter from date, format YYYY-MM-DD'),
      dateEnd: z
        .string()
        .optional()
        .describe('Filter to date, format YYYY-MM-DD'),
    },
    async ({ page, limit, status, verticalCategory, search, dateStart, dateEnd }) => {
      return withErrorHandling(async () => {
        const data = await gqlRequest<OrderHistoryResponse>(
          'GetOrderHistory',
          ORDER_HISTORY_QUERY,
          {
            Page: page ?? 1,
            Limit: limit ?? 10,
            Status: STATUS_MAP[status ?? 'all'] ?? '',
            VerticalCategory: verticalCategory ?? '',
            SearchableText: search ?? '',
            CreateTimeStart: dateStart ?? '',
            CreateTimeEnd: dateEnd ?? '',
          },
          true // requires auth
        );

        if (!data.data) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Failed to retrieve order history. Make sure TOKO_SID is set correctly in .env or MCP env.',
              },
            ],
          };
        }

        const { orders, totalOrders } = data.data.uohOrders;

        if (orders.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text:
                  status === 'all'
                    ? 'No orders found.'
                    : `No orders with status "${status}" found.`,
              },
            ],
          };
        }

        const currentPage = page ?? 1;
        const itemsPerPage = limit ?? 10;
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        const statusLabel = status && status !== 'all' ? ` (${status})` : '';
        const lines: string[] = [
          `📋 **Order History${statusLabel}**`,
          `📊 ${totalOrders.toLocaleString('id-ID')} total orders | Page ${currentPage}/${totalPages}`,
          '',
        ];

        orders.forEach((order, i) => {
          const meta = order.metadata;
          const statusInfo = meta.status;
          const product = meta.products?.[0];
          const totalPrice = meta.totalPrice;

          lines.push(
            `${(currentPage - 1) * itemsPerPage + i + 1}. **${product?.title ?? 'Multiple items'}**`
          );
          lines.push(`   🆔 Order ID: \`${order.orderUUID}\``);
          lines.push(`   📦 Category: ${order.verticalCategory}`);
          lines.push(`   🔖 Status: ${statusInfo?.label ?? order.status}`);
          if (product?.inline1?.label) lines.push(`   📝 ${product.inline1.label}`);
          if (product?.inline2?.label) lines.push(`   📝 ${product.inline2.label}`);
          lines.push(
            `   💰 Total: ${totalPrice?.label ?? ''} ${totalPrice?.value?.toLocaleString('id-ID') ?? ''}`
          );
          lines.push(`   📅 Ordered: ${meta.paymentDateStr || order.createTime}`);
          if (meta.detailURL?.webURL) {
            lines.push(`   🔗 ${meta.detailURL.webURL}`);
          }

          if (meta.buttons && meta.buttons.length > 0) {
            const actions = meta.buttons.map((b) => b.Label).filter(Boolean);
            if (actions.length > 0) {
              lines.push(`   🔘 Actions: ${actions.join(' | ')}`);
            }
          }

          if (i < orders.length - 1) lines.push('');
        });

        if (currentPage < totalPages) {
          lines.push('', `📄 Use page=${currentPage + 1} for more orders.`);
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      });
    }
  );
}
