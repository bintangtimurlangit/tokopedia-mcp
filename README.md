# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimurlangit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimurlangit/tokopedia-mcp)
[![license](https://img.shields.io/github/license/bintangtimurlangit/tokopedia-mcp?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/bintangtimurlangit/tokopedia-mcp/ci.yml?branch=main&style=flat-square)](https://github.com/bintangtimurlangit/tokopedia-mcp/actions)
[![GitHub Repo](https://img.shields.io/badge/GitHub-tokopedia--mcp-24292f?style=flat-square&logo=github)](https://github.com/bintangtimurlangit/tokopedia-mcp)

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that lets AI assistants **discover and explore** [Tokopedia](https://www.tokopedia.com) — Indonesia's marketplace. Search products, apply any of Tokopedia's filters, read full product detail and customer reviews, and inspect shops.

**Zero config, no login.** Everything is public, read-only data — there are no cookies, tokens, or accounts to set up. Install it and start searching.

**Languages:** [Bahasa Indonesia](README.id.md)

**Full reference:** [Documentation](./docs/README.md) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md) · **Versioning & releases:** [docs/RELEASES.md](./docs/RELEASES.md)

---

## Features

- **stdio transport** — Works with Cursor, Claude Code, Claude Desktop, VS Code, and any MCP client that launches a local process.
- **Public Tokopedia data** — Search, filters, product detail, reviews, and shops. No authentication.
- **Full dynamic filtering** — Discover Tokopedia's real filter options for a query and apply any of them (category, brand, Official/Power store, rating, location, price, condition, …).
- **In-memory caching** — Short TTL to avoid hammering the API on repeated lookups.
- **TypeScript + Zod** — Validated tool inputs, clear error messages.

## Tools

| Tool                    | Description                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_products`       | Keyword search with pagination, sort (`orderBy`), price range, and a generic **`filters`** map (see [Filtering](#filtering)). Returns names, prices, ratings, shop info, **product IDs**, and URLs. |
| `get_filters_and_sorts` | Discover the valid filter and sort options for a query — the `key=value` pairs to feed into `search_products`.                                                                                      |
| `get_product_detail`    | Product page data: name, price, condition, weight, seller, rating, review/sold counts, and the numeric product ID. Takes a product URL or `shopDomain` + `productKey`.                              |
| `get_product_reviews`   | Customer reviews for a product: rating, text, variant purchased, seller responses. Takes a product ID.                                                                                              |
| `get_shop_info`         | Shop profile: stats, location, open status, Official/Power Merchant badges. Takes a shop domain or ID.                                                                                              |
| `get_shop_products`     | Paginated catalog for a shop, with in-shop keyword search and sorting.                                                                                                                              |

All tools are public — no login required for any of them.

## Filtering

`search_products` accepts a generic **`filters`** argument — a map of Tokopedia filter `key`/`value` pairs. To discover the valid keys for a query, call `get_filters_and_sorts` first:

```
get_filters_and_sorts("sepatu")
  → Jenis toko: Official/Mall → "shop_tier": "2"
  → Rating:     4★ and up     → "rt": "4,5"
  → Lokasi:     Bandung        → "fcity": "165"

search_products("sepatu", filters={ "shop_tier": "2", "rt": "4,5" })
  → 4★+ shoes from Official stores only
```

Because filters are passed through generically, **any** option Tokopedia exposes for a query works — categories, brands, free shipping, COD, pre-order, condition, and more — without the tool hard-coding each one.

---

## Prerequisites

- Node.js 18 or newer

## Installation

### From npm (recommended)

Package name: **`@bintangtimurlangit/tokopedia-mcp`**. The CLI on your PATH is **`tokopedia-mcp`**.

```bash
npm install -g @bintangtimurlangit/tokopedia-mcp
```

Or run without installing:

```bash
npx -y @bintangtimurlangit/tokopedia-mcp
```

### From source (this repository)

```bash
git clone https://github.com/bintangtimurlangit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

The repo does not commit **`build/`**; run **`npm run build`** after cloning before wiring MCP to **`build/index.js`**, or use **`npm start`** / **`npm link`** and the **`tokopedia-mcp`** command locally.

## Configuration

There is **nothing to authenticate**. Add the server to your MCP client and you're done:

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimurlangit/tokopedia-mcp"]
    }
  }
}
```

Optional environment variables:

| Env key        | Default | Purpose                                      |
| -------------- | ------- | -------------------------------------------- |
| `CACHE_TTL_MS` | `30000` | In-memory cache lifetime in milliseconds.    |
| `DEBUG`        | `false` | Set to `true` to log startup info to stderr. |

Cursor, Claude Code, Claude Desktop, and other hosts use the same `mcpServers` shape — see **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** for global-install and local `node` path variants and client-specific file locations.

---

## Example prompts

Once the server is wired to your assistant:

- "Search Tokopedia for gaming laptops under Rp 15 million, sorted by best seller."
- "Find running shoes rated 4 stars and up from Official stores only."
- "Show me the details and top reviews for this product: `<url>`."
- "What does the shop `apple-authorized-reseller` sell, and how many transactions have they completed?"

## Development

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**. Run the live health check with `npm test`. Lint, format, and typecheck with `npm run lint`, `npm run format`, and `npm run typecheck`.

## Troubleshooting

| Symptom                                        | Likely cause / fix                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid request schema received`              | A GraphQL query drifted from Tokopedia's registered schema. Run `npm test` and check `DEBUG=true` output; the query's field selection needs updating. |
| A search returns no results for a valid query  | Tokopedia may be rate-limiting or has changed a filter key. Re-run `get_filters_and_sorts` to refresh valid keys, and retry.                          |
| Empty or stale results right after a change    | In-memory cache — lower `CACHE_TTL_MS` or wait for the TTL to expire.                                                                                 |
| `command not found: tokopedia-mcp` after clone | The repo doesn't commit `build/`. Run `npm run build`, then point the client at `build/index.js` (or use `npm link`).                                 |
| Client can't launch the server                 | Verify the `mcpServers` command/args path; see **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** for per-client variants.                          |

## Contributing & security

[CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) · [Code of Conduct](./CODE_OF_CONDUCT.md)

## License

[MIT](./LICENSE)

---

## Disclaimer

This is an **unofficial** project. It is **not affiliated with, authorized, maintained, sponsored, or endorsed by Tokopedia or PT Tokopedia**.

It works by calling Tokopedia's public web API, which can change without notice — a tool may break when Tokopedia updates its site (the `npm test` health check exists to catch exactly that). It reads only publicly available data and performs no account actions.

You are responsible for using this software in compliance with [Tokopedia's Terms of Service](https://www.tokopedia.com/terms) and applicable law. Use reasonable request volumes. All product names, logos, and brands are property of their respective owners.
