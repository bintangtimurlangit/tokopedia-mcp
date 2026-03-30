# Configuration

For installing the package or cloning the repo, see **[Installation](../README.md#installation)** in the README.

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

1. Log in to [tokopedia.com](https://www.tokopedia.com) in your browser.
2. Open DevTools (F12) → **Application** (Chrome) or **Storage** (Firefox) → **Cookies** → **`https://www.tokopedia.com`**.
3. For each row in the table above, find the cookie **name** (e.g. `_SID_Tokopedia_`) and copy its **value** only.
4. Put that value into the matching **`TOKO_*` key** in a `.env` file **or** inside the MCP config’s **`env`** object (see [Full `mcpServers` example with all env keys](#full-mcpservers-example-with-all-env-keys) below).

Do not commit `.env`. Session cookies are secrets; treat them like passwords.

**Minimum for authenticated tools:** set **`TOKO_SID`**. The other auth variables improve reliability; **`TOKO_DID_JS`** is optional.

### Optional tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_MS` | `30000` | Cache time-to-live in milliseconds. |
| `DEBUG` | `false` | Set to `true` for diagnostic messages on stderr (e.g. startup notice, missing `TOKO_SID` warning). |

---

## MCP configuration (all clients)

This server uses **stdio**. **Any** MCP host that can spawn a local process works: add one entry under **`mcpServers`** in that host’s config. The shape is the same everywhere; only the **file path** and **UI** differ.

### Full `mcpServers` example with all env keys

Copy cookie **values** from the browser into the **`env`** object (same names as [`.env.example`](../.env.example)). Replace the placeholders with your real values; omit optional keys or use `""` if you do not use them.

For **search / product / shop tools only**, you can leave auth-related env vars empty or remove them. For **orders** and **wishlist**, at least **`TOKO_SID`** must be set.

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimurlangit/tokopedia-mcp"],
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

Same keys work with **`command": "tokopedia-mcp"`** and **`args": []`** after a global install, or with **`command": "node"`** and **`args": ["/absolute/path/to/tokopedia-mcp/build/index.js"]`** when running from a clone.

Use an **absolute** path to `build/index.js` when using `node`. Adjust drive letters and slashes for your OS.

### Shorter example (auth minimum only)

If you only need orders/wishlist and want a minimal config:

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimurlangit/tokopedia-mcp"],
      "env": {
        "TOKO_SID": "paste_value_from_cookie__SID_Tokopedia_"
      }
    }
  }
}
```

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

VS Code MCP extensions, Zed, Windsurf, and any other **stdio MCP host** use the same pattern: register a server whose command is **`tokopedia-mcp`**, **`npx`** with **`["-y", "@bintangtimurlangit/tokopedia-mcp"]`**, or **`node`** plus the path to **`build/index.js`**, and pass Tokopedia cookies in **`env`** (or an env file if the host supports it).
