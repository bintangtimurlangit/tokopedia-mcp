#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerSearchTools } from './tools/search.js';
import { registerFilterTools } from './tools/filters.js';
import { registerProductTools } from './tools/product.js';
import { registerReviewTools } from './tools/reviews.js';
import { registerShopTools } from './tools/shop.js';
import { registerVariantTools } from './tools/variants.js';

async function main() {
  const server = new McpServer({
    name: 'tokopedia-mcp',
    version: '2.0.0',
  });

  // Register all tool groups. Every tool is public and requires no login.
  registerSearchTools(server);
  registerFilterTools(server);
  registerProductTools(server);
  registerReviewTools(server);
  registerShopTools(server);
  registerVariantTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  if (process.env.DEBUG === 'true') {
    process.stderr.write('[tokopedia-mcp] Server started via stdio (discovery mode, no auth)\n');
  }
}

main().catch((err) => {
  process.stderr.write(`[tokopedia-mcp] Fatal error: ${err}\n`);
  process.exit(1);
});
