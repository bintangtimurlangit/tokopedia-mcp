# Contributing to Tokopedia MCP

Thanks for helping improve this MCP server.

## Prerequisites

- [Node.js](https://nodejs.org/) **18+** (see `engines` in `package.json`)
- Git

## Getting started

```bash
git clone https://github.com/bintangtimurlangit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

More detail: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Workflow

1. **Fork** the repository and create a **branch** from `main` (`feat/...`, `fix/...`, etc.).
2. Make focused changes; match existing **style**, **types**, and **patterns** in the codebase.
3. **Run checks** before opening a PR:

   ```bash
   npm run typecheck
   npm run build
   npm test          # live smoke test against Tokopedia's public API
   ```

   > If you change a GraphQL query, verify it against the live API. Tokopedia's
   > gateway only accepts queries whose field selection matches its registered
   > schema, so a stale query fails with *"Invalid request schema received"*.
   > See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

4. **Commit messages** should follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat(tools): ...`, `fix(client): ...`, `docs: ...`).
5. Open a **pull request** with a clear description of what changed and why.

## What to contribute

- Bug fixes with steps to reproduce when possible
- Documentation improvements (`README.md`, `docs/`, `README.id.md`)
- Features that fit the project's scope: **public** Tokopedia discovery via MCP — search, filters, product detail, reviews, and shops. This is a read-only, no-login tool; account actions (orders, wishlist, cart, checkout) are intentionally out of scope.

## Questions

Open a [GitHub issue](https://github.com/bintangtimurlangit/tokopedia-mcp/issues) for bugs, ideas, or design discussion before large refactors.

## AI-assisted contributions

If a change was produced or heavily guided by an **AI coding agent or assistant**, disclose that in the PR description and **name the model** (e.g. *Claude Opus*, *GPT-5*, *Cursor Agent*). Use the same workflow as everyone else: **issues** for bugs and design questions, **pull requests** for proposed changes.
