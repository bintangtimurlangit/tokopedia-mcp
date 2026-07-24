# Development

## Scripts

| Command             | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `npm install`       | Install dependencies                                                                          |
| `npm run build`     | Compile TypeScript to `build/` (`tsc`)                                                        |
| `npm run dev`       | Watch mode: `tsx watch src/index.ts`                                                          |
| `npm run start`     | Run compiled server: `node build/index.js`                                                    |
| `npm run typecheck` | `tsc --noEmit`, strict, with unused-symbol checks                                             |
| `npm test`          | **Live health check** — spawns the server and calls every tool against the real Tokopedia API |

## Project layout

```
src/
  index.ts          # MCP server entry; registers all tool groups
  api/
    client.ts       # gqlRequest() — the single GraphQL entry point (public, no auth)
    types.ts        # shared search/filter types
  tools/
    search.ts       # search_products (+ generic filters map)
    filters.ts      # get_filters_and_sorts
    productPage.ts  # shared page-fetch + Apollo cache parser (used by product + variants)
    variantExtractor.ts  # extracts variant axes and SKUs from the Apollo cache
    product.ts      # get_product_detail (parses the server-rendered page)
    reviews.ts      # get_product_reviews
    shop.ts         # get_shop_info, get_shop_products
    variants.ts     # get_product_variants
  utils/
    cache.ts        # in-memory TTL cache
    errors.ts       # withErrorHandling wrapper, truncate helper
test/
  smoke.ts          # the npm test health check
  variant-extractor.test.ts  # offline unit tests for productPage + variantExtractor
```

## How the Tokopedia API is used (important)

Most tools call Tokopedia's **public GraphQL gateway** at `gql.tokopedia.com/graphql/<OperationName>` via `gqlRequest()`. Two things are easy to get wrong:

1. **The gateway validates each query against a registered schema.** If a query's field selection drifts from what Tokopedia's own site currently sends, the gateway rejects it with **`"Invalid request schema received. Kindly correct it."`** — even for a valid-looking query. So the GraphQL query strings in this repo are **captured verbatim from the live site** and must stay in sync with it. When updating one, copy the exact operation (including every `__typename`) from a real request; don't trim fields.

2. **`get_product_detail` does not use GraphQL.** Tokopedia server-renders the product page, so product core data is read from the page HTML (OpenGraph/Twitter meta tags + the dehydrated `window.__cache` Apollo store) rather than an XHR.

When Tokopedia changes its site, a tool can break. **`npm test` is the tripwire** — it exercises every tool live and fails loudly if an operation has drifted. The CI workflow also runs it on a weekly schedule.

### Re-capturing a changed query

If `npm test` flags a stale query, capture the current one from a browser: open the relevant Tokopedia page with DevTools → Network, filter to `graphql`, find the operation, and copy its request payload (`query` + `variables`). Replace the query string in the corresponding `src/tools/*.ts` file verbatim.

## Build output

`npm run build` emits JavaScript under **`build/`**. The repo **gitignores** `build/`; CI and **`prepublishOnly`** run **`npm run build`** so the npm tarball always ships compiled files.

## Local MCP testing

After `npm run build`, use **`node`** with an absolute path to **`build/index.js`** in your `mcpServers` entry, or **`npm link`** and the **`tokopedia-mcp`** bin. See [Configuration](./CONFIGURATION.md).

## Tech stack

- TypeScript, **strict** (with `noUnusedLocals` / `noUnusedParameters`)
- Zod for MCP tool input validation
- `@modelcontextprotocol/sdk` (stdio server + client for the smoke test)
