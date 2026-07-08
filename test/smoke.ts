/**
 * Live smoke test / health check.
 *
 * Spawns the real MCP server over stdio and calls every tool against the live
 * Tokopedia API, so it catches the failure mode this project is most prone to:
 * Tokopedia changing a GraphQL operation's schema and silently breaking a tool.
 *
 * Every tool is public (discovery only), so each must return real data. A
 * "Invalid request schema" response means a shipped GraphQL query has drifted
 * from the live one — this test is what catches that.
 *
 * Run with: npm test   (exits non-zero if any check fails)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxBin = resolve(__dirname, '../node_modules/.bin/tsx');
const serverEntry = resolve(__dirname, '../src/index.ts');

// Markers that mean the tool call actually failed (vs. a graceful empty/auth result).
const HARD_FAILURES = [
  'Invalid request schema',
  'Cannot query',
  'Tokopedia API returned HTTP',
  'Network error',
  'Unknown error occurred',
];
interface Check {
  tool: string;
  args: Record<string, unknown>;
  expect: string[]; // at least one substring must be present for a pass
  label?: string;
}

const CHECKS: Check[] = [
  { tool: 'search_products', args: { query: 'laptop', rows: 3 }, expect: ['Search Results'] },
  {
    tool: 'search_products',
    label: 'search_products+filters',
    // shop_tier=2 must restrict to Official/Mall stores — proves the filters map applies.
    args: { query: 'sepatu', rows: 3, filters: { shop_tier: '2' } },
    expect: ['shop_tier=2'],
  },
  { tool: 'get_filters_and_sorts', args: { query: 'laptop' }, expect: ['Filters', 'Sort'] },
  {
    tool: 'get_shop_info',
    args: { shopDomain: 'gawung-classic' },
    expect: ['Shop Stats', 'GAWUNG'],
  },
  {
    tool: 'get_shop_products',
    args: { shopDomain: 'gawung-classic', perPage: 3 },
    expect: ['Products from'],
  },
  {
    tool: 'get_product_detail',
    args: {
      url: 'https://www.tokopedia.com/gawung-classic/case-iphone-ip-11-12-13-14-15-pro-promax-sling-clapink-strap-cilapi-11-7e4f2',
    },
    expect: ['Price:', 'Product ID'],
  },
  {
    tool: 'get_product_reviews',
    args: { productId: '13164846045', limit: 3 },
    // Either real reviews or a clean "no reviews yet" — both prove the query works.
    expect: ['Reviews for', 'no reviews'],
  },
];

async function main() {
  const transport = new StdioClientTransport({
    command: tsxBin,
    args: [serverEntry],
    env: { ...process.env } as Record<string, string>,
  });
  const client = new Client({ name: 'smoke-test', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`\n🔌 Connected. Server exposes ${tools.length} tools.\n`);

  let failures = 0;
  for (const check of CHECKS) {
    let text = '';
    let status: 'PASS' | 'FAIL' = 'FAIL';
    let note = '';
    try {
      const res = (await client.callTool({ name: check.tool, arguments: check.args })) as {
        content: Array<{ type: string; text?: string }>;
      };
      text = res.content.map((c) => c.text ?? '').join('\n');

      const hardFail = HARD_FAILURES.find((m) => text.includes(m));
      if (hardFail) {
        note = `hard failure: "${hardFail}"`;
      } else if (check.expect.some((m) => text.toLowerCase().includes(m.toLowerCase()))) {
        status = 'PASS';
        note = 'returned data';
      } else {
        note = `expected one of ${JSON.stringify(check.expect)} — got: ${text.slice(0, 80).replace(/\n/g, ' ')}`;
      }
    } catch (err) {
      note = `threw: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (status === 'FAIL') failures++;
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${(check.label ?? check.tool).padEnd(24)} ${note}`);
  }

  await client.close();

  console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
