# Configuration

## Install the package

### npm (published package)

The npm package **`@bintangtimuralngit/tokopedia-mcp`** ships the compiled server under `build/` and exposes the **`tokopedia-mcp`** CLI (binary name is unchanged).

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Or use **`npx`** without a global install:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

`prepublishOnly` runs `npm run build` before publish, so the registry tarball always contains a fresh build.

### Publishing to npm (maintainers)

```bash
npm login
npm publish
```

Scoped packages use `"publishConfig": { "access": "public" }` in `package.json` so the package is public. Bump `version` in `package.json` and update `CHANGELOG.md` before each release; tag the repo with `vX.Y.Z` to match [SemVer](https://semver.org/).

### From source

```bash
npm install
npm run build
```

If the repo **ignores** `build/`, run `npm run build` after every clone before pointing MCP at `build/index.js`.

---

## Environment variables

Copy `.env.example` to `.env` when developing from a checkout, or pass variables through your MCP client’s **`env`** block (or **`envFile`**, if supported).

### Authentication (orders and wishlist)

These values come from your browser while logged in at [tokopedia.com](https://www.tokopedia.com).

| Variable | Cookie name | Required | Notes |
|----------|-------------|----------|--------|
| `TOKO_SID` | `_SID_Tokopedia_` | **Yes** for auth tools | Main session; without it, authenticated requests fail. |
| `TOKO_UUID_CAS` | `_UUID_CAS_` | Recommended | CAS session UUID. |
| `TOKO_USER_ID` | `tuid` | Recommended | Numeric user id. |
| `TOKO_DID` | `DID` | Recommended | Device fingerprint. |
| `TOKO_DID_JS` | `DID_JS` | Optional | JS device fingerprint. |

**How to copy values**

1. Log in to Tokopedia in your browser.
2. Open DevTools (F12) → **Application** (Chrome) or **Storage** (Firefox) → **Cookies** → `https://www.tokopedia.com`.
3. Find each cookie by **name** and paste its **value** into the matching variable in `.env` or `env`.

Do not commit `.env`. Session cookies are secrets; treat them like passwords.

### Optional tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_MS` | `30000` | Cache time-to-live in milliseconds. |
| `DEBUG` | `false` | Set to `true` for diagnostic messages on stderr (e.g. startup notice, missing `TOKO_SID` warning). |

---

## MCP configuration (all clients)

This server uses **stdio**. **Any** MCP host that can spawn a local process works: add one entry under **`mcpServers`** in that host’s config. The shape is the same everywhere; only the **file path** and **UI** differ.

### Example: npm / `npx` (recommended for end users)

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimuralngit/tokopedia-mcp"],
      "env": {
        "TOKO_SID": "paste_value_here"
      }
    }
  }
}
```

### Example: global `npm install -g @bintangtimuralngit/tokopedia-mcp`

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "tokopedia-mcp",
      "args": [],
      "env": {
        "TOKO_SID": "paste_value_here"
      }
    }
  }
}
```

### Example: local clone (`node` + path to `build/index.js`)

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "node",
      "args": ["E:/path/to/tokopedia-mcp/build/index.js"],
      "env": {
        "TOKO_SID": "paste_value_here"
      }
    }
  }
}
```

Use an **absolute** path to `build/index.js`. Adjust drive letters and slashes for your OS.

---

## Cursor

- **Where:** project **`.cursor/mcp.json`** or global **`~/.cursor/mcp.json`** (Windows: `%USERPROFILE%\.cursor\mcp.json`).
- **Settings:** **Cursor Settings → Features → Model Context Protocol**, or edit the JSON file.
- **Merge** the `tokopedia` entry into the top-level **`mcpServers`** object (see [Cursor MCP docs](https://cursor.com/docs/context/mcp)).
- **Optional:** on stdio servers, Cursor supports **`envFile`** (e.g. `"${workspaceFolder}/.env"`) to load secrets from a file.
- **Restart** Cursor after changes.

---

## Claude Code

- **Project scope:** **`.mcp.json`** in the repository root (good for shared team config; often committed).
- **User scope:** **`~/.claude.json`** — MCP servers under `mcpServers` (see [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)).
- **CLI:** `claude mcp add` with stdio transport — run `claude mcp --help` for options.
- **Restart** or reload so the new server is registered.

---

## Claude Desktop

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json` (if used on your platform)

Use the same **`mcpServers`** JSON as above.

---

## Other editors and tools

VS Code MCP extensions, Zed, Windsurf, and any other **stdio MCP host** use the same pattern: register a server whose command is **`tokopedia-mcp`**, **`npx`** with **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`**, or **`node`** plus the path to **`build/index.js`**, and pass Tokopedia cookies in **`env`** (or an env file if the host supports it).
