# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimuralngit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimuralngit/tokopedia-mcp)
[![license](https://img.shields.io/github/license/bintangtimuralngit/tokopedia-mcp?style=flat-square)](./LICENSE)
[![GitHub Repo](https://img.shields.io/badge/GitHub-tokopedia--mcp-24292f?style=flat-square&logo=github)](https://github.com/bintangtimuralngit/tokopedia-mcp)

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that connects AI assistants to [Tokopedia](https://www.tokopedia.com) — Indonesia’s marketplace — so they can search products, read details, inspect shops, and (with your session) manage orders and wishlists.

**Languages:** [Bahasa Indonesia](README.id.md)

**Full reference:** [Documentation](./docs/README.md) (install, configuration, MCP clients, development). **Changelog:** [CHANGELOG.md](./CHANGELOG.md). **Versioning & releases:** [docs/RELEASES.md](./docs/RELEASES.md).

---

## What you get

- **stdio transport** — Works with Cursor, Claude Code, Claude Desktop, VS Code, and any MCP client that launches a local process.
- **Tokopedia GraphQL** — Sensible defaults (headers, user agent, Indonesian locale).
- **In-memory caching** — Short TTL for repeated lookups.
- **TypeScript + Zod** — Validated tool inputs.
- **Clear errors** — MCP text responses with hints for auth and rate limits.

## Tools

### Search and discovery

| Tool | Description |
|------|-------------|
| `search_products` | Keyword search with pagination (`page`, `rows`), sort (`orderBy`), condition, rating, price range, location filters. |
| `get_filters_and_sorts` | Valid filter and sort options for a query — use before tightening `search_products`. |

### Product and shop

| Tool | Description |
|------|-------------|
| `get_product_detail` | Full product page data: pricing, description, variants, stock, ratings, images. |
| `get_shop_info` | Shop profile: badges (Gold/Official), stats, open hours, location, URLs. |
| `get_shop_products` | Paginated catalog for a shop domain. |

### Account (requires session cookies)

| Tool | Description |
|------|-------------|
| `get_order_history` | Orders with filters: status, date range (`YYYY-MM-DD`), category, search, pagination. |
| `get_wishlist` | Saved products. |
| `add_to_wishlist` | Add a product by ID. |
| `remove_from_wishlist` | Remove items using wishlist IDs from `get_wishlist`. |

Search and product tools work without logging in. Orders and wishlist need browser cookies — copy them into **`env`** or `.env` as below.

---

## Prerequisites

- Node.js 18 or newer

## Installation

### From npm (recommended)

Package name: **`@bintangtimuralngit/tokopedia-mcp`**. The CLI on your PATH is still **`tokopedia-mcp`**.

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Or run without a global install:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

Point your MCP client at **`tokopedia-mcp`**, or use **`npx`** with **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`** in `args` (see [Configuration](#configuration)).

### From source (this repository)

```bash
git clone https://github.com/bintangtimuralngit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

The repo does not commit **`build/`**; you must run **`npm run build`** after cloning before wiring MCP to **`build/index.js`**, or use **`npm start`** / **`npm link`** and the **`tokopedia-mcp`** command locally.

## Configuration

### Cookies → env

1. Log in to [tokopedia.com](https://www.tokopedia.com).
2. Open DevTools (F12) → **Application** → **Cookies** → `https://www.tokopedia.com`.
3. For each variable below, find the cookie **name** in the table (e.g. `_SID_Tokopedia_`) and copy its **value** into the matching **`TOKO_*`** key in your MCP **`env`** block (or in `.env` if you use an env file).

| Env key | Browser cookie name |
|---------|----------------------|
| `TOKO_SID` | `_SID_Tokopedia_` |
| `TOKO_UUID_CAS` | `_UUID_CAS_` |
| `TOKO_USER_ID` | `tuid` |
| `TOKO_DID` | `DID` |
| `TOKO_DID_JS` | `DID_JS` (optional) |

**Minimum for orders/wishlist:** `TOKO_SID`. Optional tuning: `CACHE_TTL_MS` (default `30000`), `DEBUG` (`true` / `false`).

### `mcpServers` example (all env keys)

Merge into your client’s config. Replace placeholders with your cookie values:

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimuralngit/tokopedia-mcp"],
      "env": {
        "TOKO_SID": "paste_value_from_cookie__SID_Tokopedia_",
        "TOKO_UUID_CAS": "paste_value_from_cookie__UUID_CAS_",
        "TOKO_USER_ID": "paste_value_from_cookie_tuid",
        "TOKO_DID": "paste_value_from_cookie_DID",
        "TOKO_DID_JS": "paste_value_from_cookie_DID_JS",
        "CACHE_TTL_MS": "30000",
        "DEBUG": "false"
      }
    }
  }
}
```

Cursor, Claude Code, Claude Desktop, and other hosts use the same `mcpServers` shape — see **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** for global install, local `node` path, and client-specific file locations.

---

## Example prompts

Once the server is wired to your assistant:

- “Search Tokopedia for gaming laptops under Rp 15 million, sort by best seller.”
- “Show product detail for this URL: …”
- “What orders are still being shipped?”
- “Add the product with ID … to my wishlist.”

## Development

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**

## Contributing & security

[CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) · [Code of Conduct](./CODE_OF_CONDUCT.md)

## License

[MIT](./LICENSE)

---

## Legal

This project is an unofficial MCP bridge. It is not affiliated with or endorsed by Tokopedia or PT Tokopedia. Use it responsibly and in line with Tokopedia’s terms of service.
