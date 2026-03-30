# Tokopedia MCP

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that connects AI assistants to [Tokopedia](https://www.tokopedia.com) — Indonesia’s marketplace — so they can search products, read details, inspect shops, and (with your session) manage orders and wishlists.

**Languages:** [Bahasa Indonesia](README.id.md)

## What you get

- **stdio transport** — Works with Cursor, Claude Desktop, VS Code, and any MCP client that launches a local process.
- **Tokopedia GraphQL** — Talks to Tokopedia’s public GraphQL endpoints with sensible defaults (headers, user agent, Indonesian locale).
- **In-memory caching** — Short TTL cache for repeated searches and lookups to reduce load and latency.
- **Typed codebase** — TypeScript with strict tooling; Zod-validated tool inputs.
- **Clear errors** — Failures surface as MCP text responses with hints when authentication or rate limits are involved.

## Tools

### Search and discovery

| Tool | Description |
|------|-------------|
| `search_products` | Keyword search with pagination (`page`, `rows`), sort (`orderBy`), condition, rating, price range, location filters. |
| `get_filters_and_sorts` | Lists valid filter and sort options for a query (location IDs, categories, etc.) — use before tightening `search_products`. |

### Product and shop

| Tool | Description |
|------|-------------|
| `get_product_detail` | Full product page data: pricing, description, variants, stock, ratings, images (from PDP layout API). |
| `get_shop_info` | Shop profile: badges (Gold/Official), stats, open hours, location, URLs. |
| `get_shop_products` | Paginated catalog for a shop domain. |

### Account (requires session cookies)

| Tool | Description |
|------|-------------|
| `get_order_history` | Order list with filters: status, date range (`YYYY-MM-DD`), vertical category, text search, pagination. |
| `get_wishlist` | Saved products. |
| `add_to_wishlist` | Add a product by ID. |
| `remove_from_wishlist` | Remove items using wishlist IDs from `get_wishlist`. |

Search and product tools work without logging in. Orders and wishlist require browser cookies from your Tokopedia account (see [Configuration](docs/CONFIGURATION.md)).

## Requirements

- Node.js 18 or newer

## Install

### From npm (recommended)

Install the package, then point your MCP client at the `tokopedia-mcp` command (the published package includes the compiled server):

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Or run a specific version without a global install:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

The published package name is scoped; the CLI on your PATH is still **`tokopedia-mcp`**. With **`npx`**, use **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`** — see [MCP configuration](#mcp-configuration) below.

### From source (this repository)

```bash
git clone <your-repo-url>
cd tokopedia-mcp
npm install
npm run build
```

The entry point is `build/index.js` — use `node` with the absolute path to that file in `args`, or run `npm start` / `tokopedia-mcp` from the project after `npm link` or local install.

## Configure environment

**Option A — `.env` file** (when running from a checkout, or if your MCP host supports `envFile`):

```bash
cp .env.example .env
```

**Option B — MCP `env` block** (works everywhere, including npm installs): put `TOKO_SID` and other variables in the server’s `env` object in your MCP config (see below).

For authenticated tools, set at least **`TOKO_SID`** (session cookie `_SID_Tokopedia_`). Other cookies improve reliability; see [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for the full list and where to find them in the browser.

## MCP configuration

This server uses **stdio**. Any MCP-capable app that can spawn a local process can use it: add a **`tokopedia`** (or any name you like) entry under **`mcpServers`** using the same JSON shape your client expects.

**Example** (merge into your existing `mcpServers`; orders and wishlist need `TOKO_SID` in `env`):

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimuralngit/tokopedia-mcp"],
      "env": {
        "TOKO_SID": "paste_cookie_value_here"
      }
    }
  }
}
```

**Alternatives:** with `npm install -g @bintangtimuralngit/tokopedia-mcp`, set `"command": "tokopedia-mcp"` and `"args": []`. From a **local clone** after `npm run build`, use `"command": "node"` and `"args": ["/absolute/path/to/tokopedia-mcp/build/index.js"]`.

### Cursor

1. Open **Cursor Settings → Features → Model Context Protocol**, or edit the JSON config directly.
2. Use **project** `.cursor/mcp.json` or **global** `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`).
3. Merge the `tokopedia` entry into the top-level **`mcpServers`** object (see [Cursor MCP docs](https://cursor.com/docs/context/mcp)).
4. Optional: set **`envFile`** to `"${workspaceFolder}/.env"` on stdio servers if you keep secrets in a project `.env`.
5. Restart Cursor after changes.

### Claude Code

1. **Project:** add or edit **`.mcp.json`** in the repo root (team-friendly; often committed).
2. **User-wide:** MCP servers live in **`~/.claude.json`** under `mcpServers` (see [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)).
3. Use the same `mcpServers` → `tokopedia` shape as above.
4. You can also run **`claude mcp add`** with stdio transport; see `claude mcp --help`.
5. Restart or reload so the new server is picked up.

### Claude Desktop

Config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Use the same `mcpServers` entry as above.

### Other editors and tools

VS Code MCP extensions, Zed, Windsurf, custom scripts, and any other **stdio MCP host** work the same way: register a server whose command runs **`tokopedia-mcp`** or **`npx -y @bintangtimuralngit/tokopedia-mcp`**, and pass cookies via **`env`** (or an env file if the host supports it).

## Example prompts

Once the server is wired to your assistant:

- “Search Tokopedia for gaming laptops under Rp 15 million, sort by best seller.”
- “Show product detail for this URL: …”
- “What orders are still being shipped?”
- “Add the product with ID … to my wishlist.”

## Development

```bash
npm run dev      # watch mode (tsx)
npm run typecheck
npm run start    # run compiled server: node build/index.js
```

## Versioning

- **SemVer** — `MAJOR.MINOR.PATCH` in `package.json`; human-readable history in [CHANGELOG.md](CHANGELOG.md).
- **Commits** — [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`feat:`, `fix:`, `docs:`, `chore:`, …) so changelogs and releases stay consistent.
- **Releases** — Git tags `v1.0.0`, `v1.1.0`, … align with the version published to npm.

## Documentation

| Document | Contents |
|----------|----------|
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables, cookie reference, full MCP examples (npm, Cursor, Claude Code, Claude Desktop). |
| [CHANGELOG.md](CHANGELOG.md) | Release notes per version (SemVer). |

## Legal

This project is an unofficial MCP bridge. It is not affiliated with or endorsed by Tokopedia or PT Tokopedia. Use it responsibly and in line with Tokopedia’s terms of service.
