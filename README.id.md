# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimuralngit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimuralngit/tokopedia-mcp)
[![GitHub Repo](https://img.shields.io/badge/GitHub-tokopedia--mcp-24292f?style=flat-square&logo=github)](https://github.com/bintangtimuralngit/tokopedia-mcp)

Server [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) yang menghubungkan asisten AI ke [Tokopedia](https://www.tokopedia.com) — marketplace Indonesia — sehingga bisa mencari produk, membaca detail, melihat toko, dan (dengan sesi Anda) mengelola pesanan serta wishlist.

**Bahasa:** [English](README.md)

**Referensi lengkap:** [Dokumentasi](./docs/README.md) (instalasi, konfigurasi, klien MCP, pengembangan). **Changelog:** [CHANGELOG.md](./CHANGELOG.md). **Versi & rilis:** [docs/RELEASES.md](./docs/RELEASES.md).

---

## Yang disediakan

- **Transport stdio** — Cursor, Claude Code, Claude Desktop, VS Code, dan klien MCP lain.
- **GraphQL Tokopedia** — Header dan locale yang wajar.
- **Cache memori** — TTL singkat untuk lookup berulang.
- **TypeScript + Zod** — Input tool tervalidasi.
- **Pesan error jelas** — Petunjuk untuk autentikasi dan rate limit.

## Tool

### Pencarian dan penemuan

| Tool | Deskripsi |
|------|-----------|
| `search_products` | Pencarian kata kunci dengan pagination, urutan, kondisi, rating, harga, lokasi. |
| `get_filters_and_sorts` | Filter dan sort yang valid untuk suatu query. |

### Produk dan toko

| Tool | Deskripsi |
|------|-----------|
| `get_product_detail` | Data halaman produk: harga, deskripsi, varian, stok, rating, gambar. |
| `get_shop_info` | Profil toko: badge, statistik, jam buka, lokasi, URL. |
| `get_shop_products` | Katalog toko per domain dengan pagination. |

### Akun (perlu cookie sesi)

| Tool | Deskripsi |
|------|-----------|
| `get_order_history` | Riwayat pesanan dengan filter status, tanggal, kategori, pencarian, pagination. |
| `get_wishlist` | Produk yang disimpan. |
| `add_to_wishlist` | Tambah produk berdasarkan ID. |
| `remove_from_wishlist` | Hapus item memakai ID wishlist dari `get_wishlist`. |

Pencarian dan detail produk bisa tanpa login. Pesanan dan wishlist membutuhkan cookie — lihat [docs/CONFIGURATION.md](./docs/CONFIGURATION.md).

---

## Persyaratan

- Node.js 18 atau lebih baru

## Instalasi

→ **[docs/INSTALLATION.md](./docs/INSTALLATION.md)**

## Konfigurasi

→ **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** — variabel lingkungan, cookie, JSON **`mcpServers`**, Cursor, Claude Code, Claude Desktop.

---

## Contoh perintah ke asisten

- “Cari laptop gaming di Tokopedia di bawah 15 juta, urutkan terlaris.”
- “Tampilkan detail produk dari URL ini: …”
- “Pesanan saya yang masih dikirim apa saja?”
- “Tambahkan produk ID … ke wishlist.”

## Pengembangan

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**

---

## Legal

Proyek ini tidak resmi dan tidak berafiliasi dengan Tokopedia. Gunakan secara bertanggung jawab dan sesuai ketentuan layanan Tokopedia.
