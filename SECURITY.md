# Security

## Supported versions

Security fixes are applied to the **latest release** on the default branch when practical. Use the current published version from npm when deploying.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security problems.

1. Use [GitHub private vulnerability reporting](https://github.com/bintangtimurlangit/tokopedia-mcp/security/advisories/new) if it is enabled for this repository, **or**
2. Contact the maintainers via a private channel (e.g. email on your GitHub profile).

Include:

- A short description of the issue and its impact
- Steps to reproduce (or a proof-of-concept), if safe to share
- Affected versions or dependency versions, if known

We aim to acknowledge reports within a few days and coordinate disclosure after a fix is available.

## Scope

This project is a **local MCP server** that talks to **Tokopedia** over the network and may hold **session cookies** you provide (`TOKO_SID`, etc.). Issues in **Tokopedia’s services** or **upstream** dependencies (e.g. `@modelcontextprotocol/sdk`) should be reported to those projects when appropriate. Protect your `.env` and MCP `env` the same way you protect passwords.
