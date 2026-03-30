# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimuralngit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimuralngit/tokopedia-mcp)
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

Search and product tools work without logging in. Orders and wishlist need browser cookies — see [docs/CONFIGURATION.md](./docs/CONFIGURATION.md).

---

## Prerequisites

- Node.js 18 or newer

## Installation

→ **[docs/INSTALLATION.md](./docs/INSTALLATION.md)** (`npm` / `npx`, clone, build)

## Configuration

→ **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** — environment variables, cookies, **`mcpServers`** JSON, Cursor, Claude Code, Claude Desktop, other editors.

---

## Example prompts

Once the server is wired to your assistant:

- “Search Tokopedia for gaming laptops under Rp 15 million, sort by best seller.”
- “Show product detail for this URL: …”
- “What orders are still being shipped?”
- “Add the product with ID … to my wishlist.”

## Development

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**

---

## Legal

This project is an unofficial MCP bridge. It is not affiliated with or endorsed by Tokopedia or PT Tokopedia. Use it responsibly and in line with Tokopedia’s terms of service.
