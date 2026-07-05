# ModKita — Panduan Deploy Netlify & Catatan PWA

## 1. Cara deploy ke Netlify

**Via Netlify UI (drag & drop / Git):**
1. Push folder ini ke GitHub/GitLab, atau upload langsung ke Netlify (New site → Import an existing project).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Functions directory: `netlify/functions` (sudah diatur otomatis lewat `netlify.toml`)
5. Deploy.

**Via Netlify CLI:**
```bash
npm install
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

Semua konfigurasi (build command, publish dir, redirects, edge function) sudah ditulis di `netlify.toml`, jadi tidak perlu setting manual di dashboard.

### Apa yang berubah dari versi asli
Proyek asli pakai Express server (`server.ts`) yang jalan terus-menerus (cocok untuk Cloud Run/VM). Netlify tidak menjalankan server seperti itu — Netlify hanya menyajikan file statis + menjalankan fungsi serverless/edge per-request. Jadi 4 route API dipisah:

| Route asli (Express) | Sekarang di Netlify |
|---|---|
| `GET /api/home` | `netlify/functions/home.mts` (Serverless Function) |
| `GET /api/search` | `netlify/functions/search.mts` (Serverless Function) |
| `GET /api/detail` | `netlify/functions/detail.mts` (Serverless Function) |
| `GET /api/download` | `netlify/edge-functions/download.ts` (**Edge Function**) |

`server.ts` (Express, untuk Cloud Run/VPS) sudah **dihapus** — lihat bagian "Pembersihan" di bawah. Semua backend sekarang murni Netlify Functions + Edge Function.

---

## 2. Status fungsi Download — sudah saya cek langsung ke an1.com

Saya menelusuri alur nyatanya di an1.com (bukan cuma baca kode):
1. Halaman detail (`https://an1.com/{id}-mod.html`) → tombol "Download (xxx Mb)" mengarah ke `https://an1.com/file_{id}-dw.html`.
2. Halaman itu berisi link `#pre_download` yang mengarah ke file APK **langsung** di domain CDN terpisah, `files.an1.net` (contoh nyata yang saya coba: `https://files.an1.net/stunt-car-extreme-mod_1.120-an1.com.apk`, ukuran ±236 MB).
3. Link itu **bisa diakses langsung tanpa captcha/token/referer-block** — jadi logika scraping di `server.ts` (ambil `#pre_download`, lalu proxy stream file-nya) itu **valid dan cocok dengan struktur situs saat ini**.

Kesimpulan: **fungsi download secara logika BEKERJA**, dengan catatan penting soal Netlify:

⚠️ **Netlify Functions biasa (Node/Lambda) membatasi response ke ~20MB (streaming) / 6MB (buffered)**, sedangkan file APK di an1.com rata-rata 100–300MB+. Kalau proxy download ini dijalankan sebagai Netlify Function biasa, file besar akan **gagal/terpotong**.

Karena itu saya pindahkan `/api/download` menjadi **Edge Function** (`netlify/edge-functions/download.ts`) yang men-stream file langsung tanpa buffering di memori — ini jauh lebih cocok untuk file besar. Ini pendekatan paling aman yang tersedia di platform Netlify, tapi untuk file yang sangat besar (ratusan MB) pada koneksi lambat, tetap ada kemungkinan gagal karena batas waktu gateway. Kalau nanti ternyata masih ada kendala untuk file-file terbesar, alternatif paling solid adalah proxy download dipisah ke server Node kecil di layanan seperti Render/Railway/Fly.io (yang tidak punya limit ukuran seperti serverless), sementara sisanya tetap statis di Netlify.

Perlu diingat juga: ini scraping dari situs pihak ketiga (an1.com) — struktur HTML mereka bisa berubah kapan saja tanpa pemberitahuan, yang akan membuat parsing (`cheerio` selectors) berhenti bekerja sampai diperbarui.

---

## 3. PWA — sudah "ready" dengan popup instalasi sendiri

- **Manifest asli** (`public/manifest.json`), bukan lagi data-URI inline.
- **Ikon lengkap** (16 s/d 512px + versi maskable) di-generate otomatis dari `public/cerah.png` → ada di `public/icons/`.
- **Service worker** (`public/sw.js`): app-shell di-cache (cache-first + update di background), sementara semua `/api/*` selalu network (tidak di-cache, karena datanya scraping live).
- **Popup install kustom**: dipicu event `beforeinstallprompt`, munculnya bukan mini-infobar bawaan browser, tapi kartu popup sendiri (pakai ikon cerah.png, tombol "Install" dan "Nanti saja"). Tombol "Install App (PWA)" di halaman Info juga sudah dihubungkan ke prompt asli ini (fallback ke instruksi manual untuk iOS, karena iOS Safari belum mendukung `beforeinstallprompt`).

## 5. Pembersihan file/dependency yang tidak kepakai

Proyek asli ini adalah template AI Studio ("react-example") yang ternyata **tidak pakai React sama sekali** — semua UI ditulis vanilla TypeScript + DOM (`src/main.ts`). Yang sudah dibuang:

**File dihapus:**
- `assets/.aistudio/` — folder khusus AI Studio, tidak dipakai di luar sana.
- `metadata.json` — config khusus AI Studio, tidak direferensikan di mana pun.
- `.env.example` — berisi `GEMINI_API_KEY` & `APP_URL` yang **tidak pernah dipakai** di kode manapun.
- `server.ts` — Express server untuk Cloud Run/VPS, sudah digantikan penuh oleh Netlify Functions/Edge Functions.
- `package-lock.json` lama — sudah tidak sinkron dengan `package.json` baru, akan digenerate ulang saat `npm install`.

**Dependency dibuang dari `package.json`** (dicek dulu, dipastikan 0 referensi di kode):
- `react`, `react-dom`, `react-router-dom`, `@vitejs/plugin-react`, `lucide-react`, `motion`, `clsx`, `tailwind-merge` — tidak ada satupun file `.tsx`/`.jsx`, dan tidak ada `import ... from 'react'` di mana pun.
- `express`, `dotenv`, `@types/express` — cuma dipakai `server.ts` yang sudah dihapus.
- `@google/genai` — tidak pernah diimport/dipanggil di kode manapun.
- `esbuild`, `tsx` — cuma dipakai untuk bundle & jalankan `server.ts` lama.
- `autoprefixer` — tidak dipakai (Tailwind v4 lewat `@tailwindcss/vite` sudah handle vendor-prefix sendiri, tidak ada `postcss.config`).

**Script `dev` diganti** dari `tsx server.ts` menjadi `netlify dev` — supaya development lokal langsung jalan lewat Netlify Functions & Edge Functions yang sekarang jadi backend beneran, bukan Express lama.

Sisa dependency yang dipakai: `vite`, `@tailwindcss/vite` + `tailwindcss` (styling), `axios` + `cheerio` (scraping di Netlify Functions), `@netlify/functions` + `@netlify/edge-functions` (tipe TypeScript).

