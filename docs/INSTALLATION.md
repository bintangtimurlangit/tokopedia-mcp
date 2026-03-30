# Installation

**Prerequisites:** [Node.js](https://nodejs.org/) **18+** (`node -v`).

## From npm (recommended)

The package is **`@bintangtimuralngit/tokopedia-mcp`**. The CLI binary name is **`tokopedia-mcp`** (unchanged).

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Run without a global install:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

Point your MCP client at **`tokopedia-mcp`**, or **`npx`** with **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`**. Full JSON examples: [Configuration](./CONFIGURATION.md).

## From source (this repository)

```bash
git clone https://github.com/bintangtimuralngit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

This repo ignores **`build/`** in git; you must run **`npm run build`** after cloning before wiring MCP to **`build/index.js`**, or use **`npm start`** / **`npm link`** and the **`tokopedia-mcp`** command locally.

## Next steps

- **Environment & MCP config:** [Configuration](./CONFIGURATION.md) (`.env`, `TOKO_SID`, Cursor, Claude Code, …)
- **Developing the server:** [Development](./DEVELOPMENT.md)
