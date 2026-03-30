# Releases and versioning

This project uses **Semantic Versioning** ([SemVer 2.0](https://semver.org/)) for the **npm package**. The canonical version string is **`package.json`** → `version`.

Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** (`feat:`, `fix:`, `docs:`, `chore:`, …) so history stays readable and tools can derive changelogs. That pairs with SemVer: `fix` → PATCH, `feat` → MINOR, breaking changes → MAJOR (see the spec for `BREAKING CHANGE` and `!`).

## Version format

`MAJOR.MINOR.PATCH` — e.g. `1.0.0`, `1.2.3`.

- **MAJOR** — Breaking changes (removed/renamed tools, incompatible env or behavior).
- **MINOR** — Backward-compatible features (new tools, new optional config).
- **PATCH** — Bug fixes and safe corrections that do not change the public contract.

## npm dist-tags

| Tag | Typical use |
|-----|-------------|
| `latest` | Default stable install: `npm install @bintangtimurlangit/tokopedia-mcp` |
| `beta` | Optional prereleases: `npm publish --tag beta` with versions like `1.1.0-beta.1` |

Scoped packages use **`"publishConfig": { "access": "public" }`** so the package is public.

## Publishing (maintainers)

1. Bump **`version`** in **`package.json`** per SemVer rules.
2. Update **`CHANGELOG.md`**: move items from **`[Unreleased]`** into **`[X.Y.Z] - YYYY-MM-DD`**, or add that section.
3. Commit with Conventional Commits, e.g. `chore(release): v1.0.1`.
4. Tag git: **`vX.Y.Z`** (e.g. `v1.0.1`).
5. Publish:

```bash
npm login
npm publish
```

**Beta:** set version to `X.Y.Z-beta.N`, then `npm publish --tag beta`.

**`prepublishOnly`** runs **`npm run build`** so the registry always ships a fresh `build/`.

## Git tags

Tag stable releases as **`vX.Y.Z`**. Optional: tag prereleases **`v1.1.0-beta.1`**.

## References

- [CHANGELOG.md](../CHANGELOG.md) — user-facing notes per release
- [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#specification)
