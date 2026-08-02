#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerSearchTools } from './tools/search.js';
import { registerFilterTools } from './tools/filters.js';
import { registerProductTools } from './tools/product.js';
import { registerReviewTools } from './tools/reviews.js';
import { registerShopTools } from './tools/shop.js';
import { registerVariantTools } from './tools/variants.js';
import { registerInsightTools } from './tools/insights.js';
import { registerCategoryTools } from './tools/category.js';

// The version reported over MCP must track package.json — hardcoding it here
// means every release silently ships a stale number to clients. Resolves to the
// package root from both `build/index.js` and `src/index.ts` (tsx dev).
function serverVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main() {
  const server = new McpServer({
    name: 'tokopedia-mcp',
    version: serverVersion(),
  });

  // Register all tool groups. Every tool is public and requires no login.
  registerSearchTools(server);
  registerFilterTools(server);
  registerProductTools(server);
  registerReviewTools(server);
  registerShopTools(server);
  registerVariantTools(server);
  registerInsightTools(server);
  registerCategoryTools(server);

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
