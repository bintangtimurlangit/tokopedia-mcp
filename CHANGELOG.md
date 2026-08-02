# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0/). For **how** we version, tag, and publish, see [docs/RELEASES.md](./docs/RELEASES.md).

## [Unreleased]

### Added

- **`get_product_variants`** — lists a product's variation axes (colour, size, storage, …) and every child SKU with per-variant price, stock, COD status, and a direct URL, so agents stop quoting the default variant's price for a different variant. Thanks to [@franshjy](https://github.com/franshjy) ([#25](https://github.com/bintangtimurlangit/tokopedia-mcp/pull/25), closes [#24](https://github.com/bintangtimurlangit/tokopedia-mcp/issues/24)).
- `CACHE_MAX_ENTRIES` (default `200`) to bound the in-memory cache.

### Fixed

- Variant axes no longer report a phantom `stock: 0` for every option. Tokopedia only populates option-level stock on the primary axis, and rendering it verbatim made in-stock sizes read as sold out.
- The version reported over MCP is read from `package.json` instead of a hardcoded value that had already drifted.

### Changed

- The cache now sweeps expired entries and evicts oldest-first instead of growing without bound, and tolerates a malformed `CACHE_TTL_MS`.
- `get_product_detail` and `get_product_variants` now share a single page fetch when called concurrently, not just sequentially.

## [2.0.1] - 2026-07-21

### Changed

- Updated development dependencies and standardized the npm trusted-publishing release workflow.

## [2.0.0] - 2026-07-08

Tokopedia MCP is now a **zero-config, public discovery server**. Account features were removed in favour of a simpler, login-free tool focused on searching and exploring products, reviews, and shops.

### Added

- **`get_product_reviews`** — customer reviews for a product (rating, text, variant purchased, seller responses).
- **Full dynamic filtering** on `search_products` via a generic `filters` map. Any filter Tokopedia exposes for a query (category, brand, Official/Power store, rating, location, condition, free shipping, …) can be applied. `get_filters_and_sorts` now returns copy-paste-ready `key=value` pairs to feed it.
- **Live health check** (`npm test`): spawns the server and exercises every tool against the real API. Runs weekly in CI to catch Tokopedia API drift.
- **Release automation**: pushing a `vX.Y.Z` tag builds and publishes to npm (with provenance) and opens a GitHub release. PR and issue templates added.

### Changed

- **BREAKING:** removed the account tools `get_order_history`, `get_wishlist`, `add_to_wishlist`, and `remove_from_wishlist`, along with all cookie/session authentication. No `TOKO_*` environment variables are used any more.
- Fixed `get_shop_info`, `get_shop_products`, and `get_product_detail`, which had broken against Tokopedia's current API. `get_shop_info` now also resolves shops by domain. `get_product_detail` reads the server-rendered product page and returns the product ID (usable with `get_product_reviews`).
- Refreshed all GraphQL queries to match Tokopedia's live schema; documented that queries must stay byte-compatible with the site.
- Updated dependencies (MCP SDK, dotenv, tsx, TypeScript, `@types/node`); resolved all `npm audit` advisories. Enabled `noUnusedLocals`/`noUnusedParameters`.
- Rewrote README (EN/ID) and `docs/` around the discovery-only model; strengthened the third-party disclaimer.

### Migration

If you used the account tools, pin the previous major: `npm install @bintangtimurlangit/tokopedia-mcp@^1`. All discovery tools are unchanged or improved, and now require no configuration.

## [1.0.0] - 2026-03-31

### Added

- Initial public release: Tokopedia MCP server over **stdio** (search, filters, product PDP, shop catalog, order history, wishlist).
- npm package **`@bintangtimurlangit/tokopedia-mcp`**; CLI binary name **`tokopedia-mcp`**.
- Documentation: English and Indonesian READMEs, guides under `docs/`.

[Unreleased]: https://github.com/bintangtimurlangit/tokopedia-mcp/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/bintangtimurlangit/tokopedia-mcp/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/bintangtimurlangit/tokopedia-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/bintangtimurlangit/tokopedia-mcp/releases/tag/v1.0.0
