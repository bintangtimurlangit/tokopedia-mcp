# Development

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to `build/` (`tsc`) |
| `npm run dev` | Watch mode: `tsx watch src/index.ts` |
| `npm run start` | Run compiled server: `node build/index.js` |
| `npm run typecheck` | `tsc --noEmit` without writing files |

## Build output

`npm run build` emits JavaScript under **`build/`**. The repo typically **gitignores** `build/`; CI and **`prepublishOnly`** run **`npm run build`** before publish so the npm tarball always includes compiled files.

## Local MCP testing

After `npm run build`, use **`node`** with an absolute path to **`build/index.js`** in your MCP `mcpServers` entry, or **`npm link`** and the **`tokopedia-mcp`** bin. See [Configuration](./CONFIGURATION.md).

## Tech stack

- TypeScript, **strict** tooling
- Zod for MCP tool inputs
- `@modelcontextprotocol/sdk` (stdio server)
