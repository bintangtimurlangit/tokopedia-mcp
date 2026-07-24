# Tokopedia MCP

[![npm](https://img.shields.io/npm/v/@bintangtimurlangit/tokopedia-mcp?style=flat-square)](https://www.npmjs.com/package/@bintangtimurlangit/tokopedia-mcp)
[![license](https://img.shields.io/github/license/bintangtimurlangit/tokopedia-mcp?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/bintangtimurlangit/tokopedia-mcp/ci.yml?branch=main&style=flat-square)](https://github.com/bintangtimurlangit/tokopedia-mcp/actions)
[![GitHub Repo](https://img.shields.io/badge/GitHub-tokopedia--mcp-24292f?style=flat-square&logo=github)](https://github.com/bintangtimurlangit/tokopedia-mcp)

Server [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) yang memungkinkan asisten AI **menjelajahi** [Tokopedia](https://www.tokopedia.com) — marketplace Indonesia. Cari produk, terapkan filter Tokopedia apa pun, baca detail produk dan ulasan pelanggan, serta lihat info toko.

**Tanpa konfigurasi, tanpa login.** Semuanya data publik yang bersifat baca-saja — tidak ada cookie, token, atau akun yang perlu disiapkan. Pasang dan langsung cari.

**Bahasa:** [English](README.md)

**Referensi lengkap:** [Dokumentasi](./docs/README.md) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md) · **Versi & rilis:** [docs/RELEASES.md](./docs/RELEASES.md)

---

## Yang disediakan

- **Transport stdio** — Cursor, Claude Code, Claude Desktop, VS Code, dan klien MCP lain.
- **Data publik Tokopedia** — Pencarian, filter, detail produk, ulasan, dan toko. Tanpa autentikasi.
- **Filter dinamis penuh** — Temukan opsi filter asli Tokopedia untuk suatu query dan terapkan semuanya (kategori, brand, toko Official/Power, rating, lokasi, harga, kondisi, …).
- **Cache memori** — TTL singkat agar tidak membebani API pada lookup berulang.
- **TypeScript + Zod** — Input tool tervalidasi, pesan error jelas.

## Tool

| Tool                    | Deskripsi                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_products`       | Pencarian kata kunci dengan pagination, urutan (`orderBy`), rentang harga, dan map **`filters`** generik (lihat [Filter](#filter)). Mengembalikan nama, harga, rating, info toko, **ID produk**, dan URL. |
| `get_filters_and_sorts` | Temukan opsi filter dan sort yang valid untuk suatu query — pasangan `key=value` untuk dipakai di `search_products`.                                                                                      |
| `get_product_detail`    | Data halaman produk: nama, harga, kondisi, berat, penjual, rating, jumlah ulasan/terjual, dan ID produk. Menerima URL produk atau `shopDomain` + `productKey`.                                            |
| `get_product_variants`  | Menampilkan sumbu variasi produk (warna, ukuran, kapasitas, dll.) dan setiap kombinasi SKU dengan harga per varian, stok, status COD, dan URL langsung. Input sama dengan `get_product_detail`.           |
| `get_product_reviews`   | Ulasan pelanggan untuk sebuah produk: rating, teks, varian yang dibeli, balasan penjual. Menerima ID produk.                                                                                              |
| `get_shop_info`         | Profil toko: statistik, lokasi, status buka, badge Official/Power Merchant. Menerima domain atau ID toko.                                                                                                 |
| `get_shop_products`     | Katalog toko dengan pagination, pencarian kata kunci dalam toko, dan pengurutan.                                                                                                                          |

Semua tool bersifat publik — tidak ada yang butuh login.

## Filter

`search_products` menerima argumen **`filters`** generik — map berisi pasangan `key`/`value` filter Tokopedia. Untuk menemukan key yang valid untuk suatu query, panggil `get_filters_and_sorts` lebih dulu:

```
get_filters_and_sorts("sepatu")
  → Jenis toko: Official/Mall → "shop_tier": "2"
  → Rating:     4★ ke atas    → "rt": "4,5"
  → Lokasi:     Bandung        → "fcity": "165"

search_products("sepatu", filters={ "shop_tier": "2", "rt": "4,5" })
  → sepatu rating 4★+ dari toko Official saja
```

Karena filter diteruskan secara generik, **opsi apa pun** yang ditampilkan Tokopedia untuk suatu query bisa dipakai — kategori, brand, gratis ongkir, COD, pre-order, kondisi, dan lainnya — tanpa perlu ditulis satu per satu di kode.

---

## Persyaratan

- Node.js 18 atau lebih baru

## Instalasi

### Dari npm (disarankan)

Nama paket: **`@bintangtimurlangit/tokopedia-mcp`**. Perintah di PATH tetap **`tokopedia-mcp`**.

```bash
npm install -g @bintangtimurlangit/tokopedia-mcp
```

Tanpa instal global:

```bash
npx -y @bintangtimurlangit/tokopedia-mcp
```

### Dari sumber (repositori ini)

```bash
git clone https://github.com/bintangtimurlangit/tokopedia-mcp.git
cd tokopedia-mcp
npm install
npm run build
```

Repositori tidak menyertakan **`build/`** di git; jalankan **`npm run build`** setelah clone sebelum mengarahkan MCP ke **`build/index.js`**, atau pakai **`npm start`** / **`npm link`** dan perintah **`tokopedia-mcp`** secara lokal.

## Konfigurasi

**Tidak ada yang perlu diautentikasi.** Tambahkan server ke klien MCP Anda dan selesai:

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

Variabel lingkungan opsional:

| Kunci env      | Bawaan  | Fungsi                                   |
| -------------- | ------- | ---------------------------------------- |
| `CACHE_TTL_MS` | `30000` | Masa cache memori dalam milidetik.       |
| `DEBUG`        | `false` | Set `true` untuk info startup ke stderr. |

Cursor, Claude Code, Claude Desktop, dan host lain memakai bentuk `mcpServers` yang sama — lihat **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)**.

---

## Contoh perintah ke asisten

- "Cari laptop gaming di Tokopedia di bawah 15 juta, urutkan terlaris."
- "Cari sepatu lari rating 4 ke atas dari toko Official saja."
- "Tampilkan detail dan ulasan teratas untuk produk ini: `<url>`."
- "Toko `apple-authorized-reseller` jual apa saja, dan berapa transaksi suksesnya?"

## Pengembangan

→ **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)**. Jalankan health check langsung dengan `npm test`.

## Kontribusi & keamanan

[CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) · [Code of Conduct](./CODE_OF_CONDUCT.md)

## Lisensi

[MIT](./LICENSE)

---

## Penafian (Disclaimer)

Ini proyek **tidak resmi**. **Tidak berafiliasi, tidak diautorisasi, dan tidak didukung oleh Tokopedia atau PT Tokopedia**.

Proyek ini memanggil API web publik Tokopedia yang bisa berubah tanpa pemberitahuan — sebuah tool bisa rusak saat Tokopedia memperbarui situsnya (health check `npm test` ada untuk mendeteksinya). Hanya membaca data yang tersedia publik dan tidak melakukan aksi akun apa pun.

Anda bertanggung jawab menggunakan perangkat lunak ini sesuai [Ketentuan Layanan Tokopedia](https://www.tokopedia.com/terms) dan hukum yang berlaku. Gunakan volume permintaan yang wajar. Semua nama produk, logo, dan merek adalah milik pemiliknya masing-masing.
