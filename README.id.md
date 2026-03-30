# Tokopedia MCP

Server [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) yang menghubungkan asisten AI ke [Tokopedia](https://www.tokopedia.com) — marketplace Indonesia — sehingga bisa mencari produk, membaca detail, melihat toko, dan (dengan sesi Anda) mengelola pesanan serta wishlist.

**Bahasa:** [English](README.md)

## Fitur

- **Transport stdio** — Cocok untuk Cursor, Claude Code, Claude Desktop, VS Code, dan klien MCP lain yang menjalankan proses lokal.
- **GraphQL Tokopedia** — Berkomunikasi dengan endpoint GraphQL Tokopedia dengan header dan locale yang wajar.
- **Cache memori** — Cache TTL singkat untuk mengurangi permintaan berulang.
- **Kode bertipe** — TypeScript; input tool divalidasi dengan Zod.
- **Pesan error jelas** — Kegagalan dikembalikan sebagai teks MCP, dengan petunjuk jika masalah autentikasi atau pembatasan laju.

## Tool

### Pencarian dan penemuan

| Tool | Deskripsi |
|------|-----------|
| `search_products` | Pencarian kata kunci dengan pagination (`page`, `rows`), urutan (`orderBy`), kondisi, rating, rentang harga, lokasi. |
| `get_filters_and_sorts` | Daftar filter dan sort yang valid untuk suatu query — gunakan sebelum mempersempit `search_products`. |

### Produk dan toko

| Tool | Deskripsi |
|------|-----------|
| `get_product_detail` | Data halaman produk: harga, deskripsi, varian, stok, rating, gambar. |
| `get_shop_info` | Profil toko: badge (Gold/Official), statistik, jam buka, lokasi, URL. |
| `get_shop_products` | Katalog toko per domain dengan pagination. |

### Akun (perlu cookie sesi)

| Tool | Deskripsi |
|------|-----------|
| `get_order_history` | Riwayat pesanan dengan filter status, rentang tanggal (`YYYY-MM-DD`), kategori vertikal, pencarian teks, pagination. |
| `get_wishlist` | Produk yang disimpan. |
| `add_to_wishlist` | Tambah produk berdasarkan ID. |
| `remove_from_wishlist` | Hapus item memakai ID wishlist dari `get_wishlist`. |

Pencarian dan detail produk bisa dipakai tanpa login. Pesanan dan wishlist membutuhkan cookie dari akun Tokopedia Anda (lihat [Konfigurasi](docs/CONFIGURATION.md)).

## Persyaratan

- Node.js 18 atau lebih baru

## Instalasi

### Dari npm (disarankan)

```bash
npm install -g @bintangtimuralngit/tokopedia-mcp
```

Atau tanpa instal global:

```bash
npx -y @bintangtimuralngit/tokopedia-mcp
```

Nama paket di npm memakai scope; perintah di PATH tetap **`tokopedia-mcp`**. Dengan **`npx`**, gunakan **`["-y", "@bintangtimuralngit/tokopedia-mcp"]`** — lihat [Konfigurasi MCP](#konfigurasi-mcp).

### Dari sumber (repositori ini)

```bash
git clone <url-repo-anda>
cd tokopedia-mcp
npm install
npm run build
```

Titik masuk: `build/index.js` — atau jalankan `tokopedia-mcp` setelah `npm link` / instal lokal.

## Konfigurasi environment

**Opsi A — berkas `.env`** (saat develop dari clone, atau jika host MCP mendukung `envFile`):

```bash
cp .env.example .env
```

**Opsi B — blok `env` di MCP** (cocok untuk paket npm): isi `TOKO_SID` dan lainnya di objek `env` server di konfigurasi MCP (lihat di bawah).

Untuk tool yang membutuhkan login, isi minimal **`TOKO_SID`**. Rincian cookie ada di [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Konfigurasi MCP

Server ini memakai **stdio**. Aplikasi apa pun yang mendukung MCP dengan proses lokal bisa memakainya: tambahkan entri (misalnya **`tokopedia`**) di dalam **`mcpServers`** sesuai format JSON yang dipakai klien Anda.

**Contoh** (gabungkan dengan `mcpServers` yang sudah ada):

```json
{
  "mcpServers": {
    "tokopedia": {
      "command": "npx",
      "args": ["-y", "@bintangtimuralngit/tokopedia-mcp"],
      "env": {
        "TOKO_SID": "isi_nilai_cookie_di_sini"
      }
    }
  }
}
```

**Alternatif:** setelah `npm install -g @bintangtimuralngit/tokopedia-mcp`, pakai `"command": "tokopedia-mcp"` dan `"args": []`. Dari **clone lokal** setelah `npm run build`, pakai `"command": "node"` dan `"args": ["/path/absolut/ke/tokopedia-mcp/build/index.js"]`.

### Cursor

1. **Cursor Settings → Features → Model Context Protocol**, atau edit JSON secara langsung.
2. Proyek: **`.cursor/mcp.json`** — global: **`~/.cursor/mcp.json`** (Windows: **`%USERPROFILE%\.cursor\mcp.json`**).
3. Gabungkan entri `tokopedia` ke objek **`mcpServers`** ([dokumentasi MCP Cursor](https://cursor.com/docs/context/mcp)).
4. Opsional: **`envFile`** ke `"${workspaceFolder}/.env"` jika rahasia di `.env` proyek.
5. Restart Cursor setelah mengubah konfigurasi.

### Claude Code

1. **Proyek:** berkas **`.mcp.json`** di root repo.
2. **Pengguna:** **`~/.claude.json`** — bagian `mcpServers` ([dokumentasi MCP Claude Code](https://docs.anthropic.com/en/docs/claude-code/mcp)).
3. Format JSON sama seperti contoh di atas.
4. Opsional: **`claude mcp add`** untuk transport stdio — lihat `claude mcp --help`.

### Claude Desktop

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Editor dan tool lain

VS Code (ekstensi MCP), Zed, Windsurf, dan host MCP **stdio** lain memakai pola yang sama: daftarkan server dengan **`tokopedia-mcp`** atau **`npx -y @bintangtimuralngit/tokopedia-mcp`**, dan lewatkan cookie lewat **`env`** (atau env file jika didukung).

## Contoh perintah ke asisten

- “Cari laptop gaming di Tokopedia di bawah 15 juta, urutkan terlaris.”
- “Tampilkan detail produk dari URL ini: …”
- “Pesanan saya yang masih dikirim apa saja?”
- “Tambahkan produk ID … ke wishlist.”

## Pengembangan

```bash
npm run dev      # mode watch (tsx)
npm run typecheck
npm run start    # jalankan build: node build/index.js
```

## Versi

- **SemVer** — `MAJOR.MINOR.PATCH` di `package.json`; catatan rilis di [CHANGELOG.md](CHANGELOG.md).
- **Commit** — [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`feat:`, `fix:`, `docs:`, `chore:`, …).
- **Rilis** — Tag Git `v1.0.0`, `v1.1.0`, … mengikuti versi npm.

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Variabel lingkungan, cookie, contoh lengkap (npm, Cursor, Claude Code, Claude Desktop). |
| [CHANGELOG.md](CHANGELOG.md) | Catatan rilis per versi (SemVer). |

## Legal

Proyek ini tidak resmi dan tidak berafiliasi dengan Tokopedia. Gunakan secara bertanggung jawab dan sesuai ketentuan layanan Tokopedia.
