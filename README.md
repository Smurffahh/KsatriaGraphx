# Ksatria Graphx (v1.0.0)

> Sistem Kasir (Point of Sale), Kalkulator Harga Percetakan Digital, dan Manajemen Operasional Berbasis Cloud (Web & Android APK Hardened).

---

## 1. Ikhtisar Arsitektur

**Ksatria Graphx** dirancang dengan arsitektur modern *dual-surface* (Fullstack Web App Router untuk manajemen pemilik toko & browser kasir, serta Android Native Hybrid berbasis Capacitor untuk kasir operasional tablet/smartphone):

- **Frontend & Fullstack Core:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide React, Recharts.
- **Backend & Database:** Next.js Route Handlers, Neon PostgreSQL Serverless dengan Drizzle ORM (Connection Pooling + WebSocket Driver).
- **Penyimpanan Media:** Vercel Blob (`@vercel/blob`) dengan validasi Magic Bytes anti-eksekusi file.
- **Mobile Native Runtime:** Capacitor 8 Android (`id.ksatriagraphx.app`), plugin kustom Java Bluetooth SPP untuk Printer Thermal ESC/POS, dan Android Keystore hardware-backed token storage via `@aparajita/capacitor-secure-storage`.
- **Quality Assurance & CI:** Vitest (149 unit/integration/pentest tests), Playwright (17 E2E tests lintas Desktop & Mobile viewport), GitHub Actions Cloud APK Build.

---

## 2. Fitur Utama Sistem

1. **Autentikasi & RBAC Ketat:** Pemisahan hak akses antara `OWNER` (Manajemen toko, tambah/edit user, lihat laporan omzet global, konfigurasi sistem, dan audit log forensik) dan `KASIR` (Operasional POS, input pesanan, pelunasan nota, cetak nota).
2. **Kalkulator POS Khusus Percetakan:** Perhitungan dinamis berbasis satuan meter/cm (panjang $\times$ lebar), minimal penagihan ($1\text{ m}^2$), pembulatan kelipatan $0.1\text{ m}$, harga bertingkat (*quantity tiers*), dan opsi finishing.
3. **Verifikasi Harga Zero-Trust:** Seluruh nominal harga, subtotal, diskon, dan grand total dihitung ulang secara independen di sisi server; payload manipulasi harga dari client otomatis ditolak.
4. **Manajemen Transaksi & Piutang (DP):** Dukungan pembayaran penuh (*PAID*), uang muka/panjar (*PARTIAL*), dan belum bayar (*UNPAID*), dengan pelacakan sisa piutang otomatis.
5. **Cetak Nota Kasir Multimoda:**
   - **Web:** Print nota langsung via dialog cetak browser atau ekspor PDF.
   - **Android APK:** Cetak langsung ke Printer Thermal Bluetooth portabel (ukuran 58mm / 80mm) via Bluetooth Classic SPP (`00001101-0000-1000-8000-00805F9B34FB`), atau bagikan nota gambar langsung ke WhatsApp/pelanggan.
6. **Laporan & Ekspor CSV Aman:** Ringkasan omzet, arus kas riil berdasarkan metode pembayaran (Tunai, Transfer, QRIS), dan ekspor data penjualan dengan sanitasi *CSV formula injection* (RFC 4180 + UTF-8 BOM).
7. **Audit Log Forensik:** Rekam jejak immutable untuk setiap aktivitas sensitif (login, perubahan user, pembatalan nota, transaksi) mencakup IP, User-Agent, platform, dan snapshot metadata.
8. **Automated Cloud CI APK Build:** Build otomatis file `.apk` (Debug & Release Signed dengan ProGuard/R8) di cloud via GitHub Actions.

---

## 3. Arsitektur Keamanan (Defense-in-Depth)

Sistem menerapkan standar keamanan tinggi berbasis OWASP Top 10 dan PRD v1.2.0 Bagian 8.5:

- **4-Layer Web-Only Guard:** Endpoint sensitif khusus Web (`/users`, `/audit-logs`, `/settings`) diproteksi 4 lapis (verifikasi platform header, User-Agent, Origin, dan peran pengguna) sehingga tidak dapat ditembus meski dipanggil dari perangkat mobile/APK.
- **Anti-Brute Force:** Kunci akun otomatis setelah 5 kali gagal login berturut-turut, password hashing menggunakan `bcrypt` cost factor minimal 12, dan validasi sesi via tokenVersion.
- **Magic Bytes Validation:** Upload media produk memvalidasi *file signature* byte header asli (bukan hanya ekstensi), menolak SVG berpotensi XSS, dan membatasi ukuran maksimal 2 MB.
- **Android Hardening:** Konfigurasi AndroidManifest mematikan backup otomatis (`android:allowBackup="false"`), memblokir komunikasi tidak terenkripsi (`android:usesCleartextTraffic="false"`), serta menerapkan R8/ProGuard minification & resource shrinking pada versi rilis.

---

## 4. Panduan Menjalankan Proyek Secara Lokal

### Prasyarat
- Node.js versi 20+ (disarankan Node 22)
- pnpm versi 10+ (disarankan pnpm 12)

### Langkah Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/Smurffahh/KsatriaGraphx.git
   cd KsatriaGraphx
   ```
2. Pasang dependensi:
   ```bash
   pnpm install
   ```
3. Salin konfigurasi environment:
   ```bash
   cp .env.example .env.local
   ```
   *Isi `.env.local` dengan kredensial database Neon PostgreSQL dan secret token lokal Anda.*

4. Jalankan migrasi dan seed awal database:
   ```bash
   pnpm run db:push
   pnpm run db:seed
   ```

5. Jalankan development server:
   ```bash
   pnpm run dev
   ```
   Buka browser di `http://localhost:3000`.

---

## 5. Pengujian & Quality Assurance

Proyek ini dilengkapi dengan suite pengujian otomatis yang ketat:

- **Typecheck & Linter:**
  ```bash
  pnpm run typecheck
  pnpm run lint
  ```
- **Unit & Security Penetration Tests (Vitest):**
  ```bash
  pnpm test
  ```
- **End-to-End Tests (Playwright):**
  ```bash
  pnpm run test:e2e
  ```
- **Simulasi Build Produksi:**
  ```bash
  cross-env DATABASE_URL="" BLOB_READ_WRITE_TOKEN="" pnpm run build
  ```

---

## 6. Build Mobile Android APK

Untuk panduan mendetail mengenai build APK lokal maupun otomatis via GitHub Actions Cloud CI, silakan baca dokumentasi terpisah:

👉 **[Panduan Lengkap Build Android APK](docs/android-apk-build.md)**

---

## 7. Riwayat Rilis

Lihat riwayat pembaruan dan catatan rilis pada **[CHANGELOG.md](CHANGELOG.md)**.
