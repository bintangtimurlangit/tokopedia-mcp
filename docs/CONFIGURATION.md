# Configuration

For installing the package or cloning the repo, see **[Installation](../README.md#installation)** in the README.

> **No authentication.** This server is public and read-only. There are no cookies, tokens, or accounts to configure — adding the server to your MCP client is all that's required.

---

## Environment variables

All optional. Set them in your MCP client's **`env`** block, or copy `.env.example` to `.env` when developing from a checkout.

| Variable            | Default | Description                                                          |
| ------------------- | ------- | -------------------------------------------------------------------- |
| `CACHE_TTL_MS`      | `30000` | In-memory cache time-to-live in milliseconds.                        |
| `CACHE_MAX_ENTRIES` | `200`   | Max cached entries before the oldest are evicted. Bounds memory use. |
| `DEBUG`             | `false` | Set to `true` for a startup notice on stderr.                        |

---

## MCP configuration (all clients)

This server uses **stdio**. **Any** MCP host that can spawn a local process works: add one entry under **`mcpServers`** in that host's config. The shape is the same everywhere; only the **file path** and **UI** differ.

### Minimal `mcpServers` entry

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

### With optional tuning

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimurlangit/tokopedia-mcp"],
      "env": {
        "CACHE_TTL_MS": "30000",
        "DEBUG": "false"
      }
    }
  }
}
```

The same entry works with **`"command": "tokopedia-mcp"`** and **`"args": []`** after a global install, or with **`"command": "node"`** and **`"args": ["/absolute/path/to/tokopedia-mcp/build/index.js"]`** when running from a clone. Use an **absolute** path to `build/index.js` with `node`, and adjust drive letters and slashes for your OS.

---

## Cursor

- **Where:** project **`.cursor/mcp.json`** or global **`~/.cursor/mcp.json`** (Windows: `%USERPROFILE%\.cursor\mcp.json`).
- **Settings:** **Cursor Settings → Features → Model Context Protocol**, or edit the JSON file.
- **Merge** the `tokopedia` entry into the top-level **`mcpServers`** object (see [Cursor MCP docs](https://cursor.com/docs/context/mcp)).
- **Restart** Cursor after changes.

---

## Claude Code

- **Project scope:** **`.mcp.json`** in the repository root (good for shared team config; often committed).
- **User scope:** **`~/.claude.json`** — MCP servers under `mcpServers` (see [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)).
- **CLI:** `claude mcp add tokopedia -- npx -y @bintangtimurlangit/tokopedia-mcp`.
- **Restart** or reload so the new server is registered.

---

## Claude Desktop

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Use the same **`mcpServers`** JSON as above.

---

## Other editors and tools

VS Code MCP extensions, Zed, Windsurf, and any other **stdio MCP host** use the same pattern: register a server whose command is **`tokopedia-mcp`**, **`npx`** with **`["-y", "@bintangtimurlangit/tokopedia-mcp"]`**, or **`node`** plus the path to **`build/index.js`**. No secrets or `env` are required.
