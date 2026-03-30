# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimuralngit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimuralngit/tokopedia-mcp)
[![license](https://img.shields.io/github/license/bintangtimuralngit/tokopedia-mcp?style=flat-square)](./LICENSE)
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

Pencarian dan detail produk bisa tanpa login. Pesanan dan wishlist membutuhkan cookie — salin ke **`env`** atau `.env` seperti di bawah.

---

## Persyaratan

- Node.js 18 atau lebih baru

## Instalasi

### Dari npm (disarankan)

Nama paket: **`@bintangtimuralngit/tokopedia-mcp`**. Perintah di PATH tetap **`tokopedia-mcp`**.

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Tanpa instal global:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

Hubungkan klien MCP ke **`tokopedia-mcp`**, atau **`npx`** dengan **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`** di `args` (lihat [Konfigurasi](#konfigurasi)).

### Dari sumber (repositori ini)

```bash
git clone https://github.com/bintangtimuralngit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

Repositori tidak menyertakan **`build/`** di git; jalankan **`npm run build`** setelah clone sebelum mengarahkan MCP ke **`build/index.js`**, atau pakai **`npm start`** / **`npm link`** dan perintah **`tokopedia-mcp`** secara lokal.

## Konfigurasi

### Cookie → env

1. Login ke [tokopedia.com](https://www.tokopedia.com).
2. Buka DevTools (F12) → **Application** → **Cookies** → `https://www.tokopedia.com`.
3. Untuk setiap baris di tabel, cari **nama** cookie di browser, lalu salin **nilai**-nya ke kunci **`TOKO_*`** yang sesuai di blok **`env`** MCP (atau di `.env`).

| Kunci env | Nama cookie di browser |
|-----------|-------------------------|
| `TOKO_SID` | `_SID_Tokopedia_` |
| `TOKO_UUID_CAS` | `_UUID_CAS_` |
| `TOKO_USER_ID` | `tuid` |
| `TOKO_DID` | `DID` |
| `TOKO_DID_JS` | `DID_JS` (opsional) |

**Minimum untuk pesanan/wishlist:** `TOKO_SID`. Opsional: `CACHE_TTL_MS` (bawaan `30000`), `DEBUG` (`true` / `false`).

### Contoh `mcpServers` (semua kunci env)

Gabungkan ke konfigurasi klien Anda. Ganti placeholder dengan nilai cookie Anda:

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimuralngit/tokopedia-mcp"],
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

Cursor, Claude Code, Claude Desktop, dan host lain memakai bentuk `mcpServers` yang sama — detail instal global, path `node` lokal, dan lokasi berkas: **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)**.

---

## Contoh perintah ke asisten

- “Cari laptop gaming di Tokopedia di bawah 15 juta, urutkan terlaris.”
- “Tampilkan detail produk dari URL ini: …”
- “Pesanan saya yang masih dikirim apa saja?”
- “Tambahkan produk ID … ke wishlist.”

## Pengembangan

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**

## Kontribusi & keamanan

[CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) · [Code of Conduct](./CODE_OF_CONDUCT.md)

## Lisensi

[MIT](./LICENSE)

---

## Legal

Proyek ini tidak resmi dan tidak berafiliasi dengan Tokopedia. Gunakan secara bertanggung jawab dan sesuai ketentuan layanan Tokopedia.
