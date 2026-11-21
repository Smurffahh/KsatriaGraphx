# Catatan Rilis (Changelog) — Ksatria Graphx

Semua pembaruan terstruktur untuk proyek **Ksatria Graphx** didokumentasikan dalam dokumen ini.

---

## [v1.0.1] - 2026-11-21

Rilis pembaruan pemeliharaan dan penguatan arsitektur autentikasi Android APK, penanganan CORS preflight menyeluruh, pemisahan diagnostik login, serta otomasi rilis GitHub Actions.

### Perbaikan Penting
- **Resolusi Base URL Login Android APK**: Memperbaiki pemanggilan endpoint autentikasi pada `src/app/(auth)/login/page.tsx` menggunakan `resolveApiUrl("/api/auth/login", isNative)` sehingga aplikasi Android APK yang berjalan di WebView Capacitor (`https://localhost`) mengarahkan request secara tepat ke backend produksi (`NEXT_PUBLIC_API_BASE_URL`), bukan meminta aset statis lokal yang tidak tersedia.
- **Peningkatan Diagnosa Error Login**: Membedakan kode error status HTTP secara spesifik pada antarmuka kasir/pengguna (HTTP 401: Username/password salah; HTTP 429: Rate-limit lockout; HTTP 403: Kebijakan keamanan; kode `NET`: Masalah koneksi/CORS; kode `STORAGE`: Kegagalan penyimpanan token lokal di Keystore).
- **Penanganan Kredensial Request APK**: Mengatur mode `credentials: "omit"` pada request native APK di `src/lib/api/client.ts` dan halaman login untuk mencegah pemblokiran kebijakan cross-origin cookie WebView Android, serta murni memanfaatkan otorisasi Bearer token.
- **CORS Preflight Global & Edge-Safe**: Mengimplementasikan `src/middleware.ts` untuk menangani seluruh preflight `OPTIONS` di `/api/:path*` dengan respon instan `204 No Content` beserta header CORS lengkap (`Access-Control-Allow-Origin: https://localhost`, `Access-Control-Max-Age: 86400`, dll.), serta menyematkan header `OPTIONS` sekunder di seluruh route handler API sebagai pertahanan berlapis.
- **Isolasi Middleware pada Script Build Mobile**: Memperbarui `scripts/build-mobile.mjs` agar memindahkan sementara `src/middleware.ts` saat Next.js mengeksekusi static export (`output: 'export'`), dan memulihkannya kembali utuh 100% pada blok `finally` dengan mekanisme fallback penonaktifan file route individual yang tangguh di sistem operasi Windows.

### Fitur Baru & Peningkatan
- **Otomasi Catatan Rilis GitHub Actions**: Menambahkan step ekstraksi otomatis bagian versi terkait dari `CHANGELOG.md` pada workflow `.github/workflows/android-apk.yml` sehingga halaman GitHub Releases langsung menampilkan daftar fitur, panduan instalasi APK, dan tabel checksum integritas SHA-256.
- **Sinkronisasi Konfigurasi Environment**: Menyediakan pemisahan file konfigurasi yang rapi antara `.env.local` (lingkungan penuh untuk komputer lokal) dan `.env.vercel` (khusus upload Vercel Dashboard bebas konflik variabel injeksi otomatis Neon dan Vercel Blob).

### Catatan Keamanan
- **Hardening ProGuard/R8 Release APK**: Menambahkan aturan eksplisit pada `android/app/proguard-rules.pro` untuk mempertahankan kelas `com.aparajita.capacitor.securestorage.**` dan `id.ksatriagraphx.app.ThermalPrinterPlugin`.
- **Integritas 4-Layer Web-Only Guard**: Memastikan proteksi ketat pada `/api/users/**` tetap menolak `Authorization: Bearer`, origin `https://localhost`, dan `capacitor://localhost` dengan respon `403 Forbidden`.
- **Zero Secret Leak Gate**: Memastikan seluruh kunci token rahasia (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, dan token Blob) terproteksi penuh dari pencatatan log maupun bundle publik client `.next/static/` dan `out/`.

---

## [v1.0.0] — 2026-11-20

Rilis resmi perdana (*Production General Availability*) **Ksatria Graphx**, sistem Point of Sale (POS) dan manajemen percetakan digital *dual-platform* (Web & Android APK Hardened).

### Pencapaian & Fitur per Fase

#### Fase 1: Fondasi Teknis, Skema Database & Utilitas Inti
- Inisialisasi Next.js 15 (App Router), React 19, Tailwind CSS v4, dan TypeScript strict mode.
- Skema database modular Drizzle ORM pada Neon PostgreSQL Serverless (katalog produk, pelanggan, pesanan, pembayaran, nomor nota berurutan, pengaturan toko, dan log audit).
- Implementasi kalkulator harga percetakan berbasis dimensi m/cm, minimal penagihan 1 m², pembulatan 0.1 m, harga bertingkat (*tiers*), dan opsi finishing.
- Utilitas isolasi lingkungan (`src/lib/env.ts`) dengan validasi `zod` lazy evaluation aman untuk fase kompilasi static.

#### Fase 2: Autentikasi, Sesi Berlapis & Keamanan RBAC (US-001, US-002, US-003)
- Sistem autentikasi ganda: HttpOnly Secure Cookies untuk Web dan Header Bearer Tokens untuk Android APK.
- Hashing password dengan `bcrypt` cost factor minimal 12 dan mekanisme brute-force lockout (5x gagal kunci sementara).
- Proteksi **4-Layer Web-Only Guard** pada endpoint administratif (`/users`, `/audit-logs`, `/settings`).
- Layanan manajemen pengguna untuk Owner: buat akun kasir, edit profil, reset password, dan putus sesi aktif (*revoke sessions*).

#### Fase 3: Manajemen Katalog Percetakan, Finishing & Pengaturan Toko (US-004, US-004B, US-005, US-006)
- CRUD Kategori Produk dan Opsi Finishing percetakan.
- Manajemen Produk komprehensif dengan dukungan tipe harga (Per Meter / Satuan Tetap) dan aturan tier kuantitas.
- Upload foto produk ke Vercel Blob dengan validasi Magic Bytes (penolakan SVG dan file non-gambar).
- Pengaturan identitas toko (nama usaha, alamat, nomor telepon/WhatsApp, dan catatan nota) yang tercermin pada struk belanja.

#### Fase 4: Point of Sale (POS), Validasi Zero-Trust & Pelunasan Transaksi (US-007, US-008, US-009, US-010, US-015)
- Layar kasir POS responsif dan cepat dengan fitur kalkulator dimensi langsung di keranjang belanja.
- Verifikasi harga **Zero-Trust**: validasi nominal, diskon, dan grand total dihitung ulang secara mutlak di sisi server untuk mencegah manipulasi client-side.
- Penomoran nota otomatis dan unik berurutan per hari format `INV-YYYYMMDD-XXXX`.
- Alur transaksi fleksibel: Pembayaran Lunas (PAID), Uang Muka / Panjar (PARTIAL), dan Belum Bayar (UNPAID).
- Dialog pelunasan piutang (*remaining balance*) dengan pencatatan riwayat pembayaran bertahap.

#### Fase 5: Laporan Penjualan, Arus Kas & Audit Log Forensik (US-011, US-013, US-014)
- Dashboard KPI ringkasan omzet, antrean cetak, dan tren transaksi untuk Owner dan Kasir.
- Haporan penjualan dengan filter tanggal, kasir, dan status pembayaran, serta pemisahan arus kas riil berdasarkan metode bayar (CASH, TRANSFER, QRIS).
- Ekspor laporan penjualan ke CSV dengan sanitasi formula injection (RFC 4180 + UTF-8 BOM) aman dibuka di Microsoft Excel.
- Rekam jejak audit log forensik yang mencatat setiap aksi kritis beserta IP, User-Agent, platform, dan metadata.

#### Fase 6: Integrasi Android APK Hardened, Printer Thermal Bluetooth & Cloud CI (US-012, US-016, US-017)
- Dual-Build architecture Next.js (Web Serverless vs Static Export `out/` untuk Android Capacitor).
- Integrasi Printer Thermal Bluetooth portabel (ukuran 58mm & 80mm) via Custom Native Plugin Java (`ThermalPrinterPlugin.java`) dengan Bluetooth SPP UUID dan chunked write 128 bytes.
- Fitur bagikan nota digital (Canvas to PNG) langsung via native share sheet Android (WhatsApp, Email).
- Hardening Android APK: R8/ProGuard minification, resource shrinking, `allowBackup="false"`, `usesCleartextTraffic="false"`, dan penyimpanan token pada Android Keystore hardware via `@aparajita/capacitor-secure-storage`.
- Workflow GitHub Actions Cloud CI (`.github/workflows/android-apk.yml`) untuk build Debug APK dan Signed Release APK otomatis setiap pembuatan Git Tag rilis.

#### Fase 7: Pengujian Menyeluruh, Penetration Self-Check & Playwright E2E
- 149 pengujian otomatis Vitest lulus 100% (termasuk 25 skenario uji penetrasi keamanan mendalam PRD Bagian 8.5).
- 17 skenario E2E Playwright lintas viewport (Desktop 1280x800 & Mobile 375x812) lulus 100%.
- Audit kualitas Chrome DevTools MCP: LCP 90ms, CLS 0.00, TTFB 5ms, skor Lighthouse SEO 100, Best Practices 100, Agentic Browsing 100, dan Accessibility 100 (WCAG AA).
- Audit dependensi produksi `pnpm audit --prod`: 0 celah keamanan (overrides `postcss` dan `zod` via `pnpm-workspace.yaml`).
- Zero Secret Leak: client bundle `.next/static/` dan `out/` diverifikasi bebas dari kredensial database atau token rahasia.
