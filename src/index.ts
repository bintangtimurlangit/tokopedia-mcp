#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerSearchTools } from './tools/search.js';
import { registerFilterTools } from './tools/filters.js';
import { registerProductTools } from './tools/product.js';
import { registerShopTools } from './tools/shop.js';
import { registerOrderTools } from './tools/orders.js';
import { registerWishlistTools } from './tools/wishlist.js';

async function main() {
  const server = new McpServer({
    name: 'tokopedia-mcp',
    version: '1.0.0',
  });

  // Register all tool groups
  registerSearchTools(server);
  registerFilterTools(server);
  registerProductTools(server);
  registerShopTools(server);
  registerOrderTools(server);
  registerWishlistTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (process.env.DEBUG === 'true') {
    process.stderr.write('[tokopedia-mcp] Server started via stdio\n');
    if (!process.env.TOKO_SID) {
      process.stderr.write(
        '[tokopedia-mcp] ⚠ TOKO_SID not set — authenticated tools (orders, wishlist) will fail\n'
      );
    }
  }
}

main().catch((err) => {
  process.stderr.write(`[tokopedia-mcp] Fatal error: ${err}\n`);
  process.exit(1);
});
