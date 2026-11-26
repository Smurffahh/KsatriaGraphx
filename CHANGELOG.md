# Catatan Rilis (Changelog) — Ksatria Graphx

Semua pembaruan terstruktur untuk proyek **Ksatria Graphx** didokumentasikan dalam dokumen ini.

---

## [v1.4.0] - 2026-11-26

Pembaruan v1.4.0 merombak proporsi tata letak, skala tipografi, serta kenyamanan sentuh di seluruh antarmuka **Ksatria Graphx** lintas Desktop, Tablet, dan Mobile/APK Android:

### Skala Tipografi, Komponen & Tata Letak Utama
- **Standardisasi Komponen UI**: Memperbesar proporsi tombol, kartu, tabel, dialog, dan lencana (*badge*) pada `src/components/ui/` serta memastikan area tutup minimal `40px-44px` di layar kecil.
- **Navigasi `AppShell` & Drawer Mobile**: Menaikkan tinggi topbar menjadi `64px` (`min-h-16`), memberi ruang bawah khusus `/pos` (`pb-36`), serta menata ulang kartu pengguna pada drawer *Menu & Pengaturan* agar lencana peran selalu berada di baris rapi dengan jarak aman dari tombol tutup (`0px` tumpang tindih).

### Formulir Mobile 16px, POS & Kalkulator Cepat
- **Input Anti-Zoom iOS/Android**: Menaikkan seluruh ukuran teks kolom input dan filter di perangkat mobile menjadi `16px` (`text-base sm:text-sm`) dengan tinggi sentuh `44px` (`h-11`), mencakup halaman Login, Kalkulator POS, Modal Checkout, Kalkulator Cepat, Pesanan, Produk, Pelanggan, Laporan, Audit Log, Pengguna, dan Pengaturan.
- **Tata Letak Responsif & Stabilitas Modal Produk**: Menyesuaikan susunan filter tanggal pesanan, header tablet `Dashboard` (`lg:flex-row`), serta memisahkan efek inisialisasi kategori di `ProductFormModal` agar muatan data asinkron tidak mereset kolom produk yang sedang diisi.

### Verifikasi Visual & Kualitas
- **Audit Visual Multi-Viewport**: Menguji tampilan terang dan gelap di resolusi Desktop (`1440x900`), Tablet (`768x1024`), dan Mobile (`375x812`) dengan nol *horizontal overflow* dan nol pemakaian `transition-all`.
- **Pengujian Otomatis & Keamanan Rilis**: Memverifikasi rangkaian unit tests Vitest, skenario Playwright E2E lintas Desktop dan Mobile Chrome, serta *dual-build* Web dan ekspor statis Android APK tanpa kebocoran rahasia.

---

## [v1.3.4] - 2026-11-24

Pembaruan v1.3.4 mencakup pembersihan kode mati (*dead code cleanup*), perapian dependensi render antarmuka, serta audit dan penguatan keamanan menyeluruh pada 20 titik pemeriksaan sistem:

### Pembersihan Kode & Perapian ESLint
- **Stabilisasi Render Pengguna**: Memperbaiki memoization fungsi pemuatan data (`loadData`) pada `src/app/(dashboard)/users/page.tsx` menggunakan `useCallback`, menghilangkan seluruh peringatan dependensi React Hooks pada ESLint.
- **Audit Dependensi & Komponen**: Memverifikasi 29 paket dependensi serta seluruh komponen antarmuka aktif digunakan tanpa adanya modul mati (*dead code*).

### Penguatan Keamanan Sistem (20 Security Checks)
- **Validasi Ketat Format UUID**: Menerapkan fungsi pembantu `isValidUuid` pada seluruh parameter rute dinamis backend (`orders/[id]`, `payments`, `customers/[id]`, `products/[id]`, `categories/[id]`, `finishings/[id]`, `users/[id]`, `reset-password`, dan `revoke-sessions`), langsung mengembalikan respon `400 Bad Request` sebelum kueri dieksekusi ke database jika ID tidak valid.
- **Sanitasi Pesanan Error Server 500**: Mengintegrasikan `handleGuardError` ke dalam penanganan galat terpusat `handleApiError` dan menyaring pesan galat basis data PostgreSQL/Drizzle ORM agar tidak membocorkan detail internal tabel kepada pengguna luar.
- **Pencegahan Kunci Rahasia Bawaan (Fallback Secret)**: Memastikan generator token JWT pada mode produksi menolak fallback string dan langsung melempar galat konfigurasi jika `JWT_ACCESS_SECRET` kosong.
- **Penegakan Enkripsi Koneksi Database**: Memvalidasi parameter koneksi database mewajibkan `sslmode=require` pada lingkungan produksi sebelum inisialisasi koneksi Neon Serverless.
- **Mitigasi Serangan Waktu Autentikasi (Timing Attack)**: Menambahkan verifikasi hash kata sandi dummy pada rute login ketika akun tidak ditemukan, menyamakan latensi respons autentikasi antara akun yang ada dan yang tidak ada.
- **Transaksi Atomik Pemulihan Kata Sandi**: Menggabungkan pembaruan hash kata sandi baru dan pembatalan seluruh sesi login aktif ke dalam satu transaksi basis data atomik.
- **Proteksi Bom Dekompresi Gambar**: Menetapkan batas resolusi piksel maksimum (`limitInputPixels: 16_000_000` / 16 MP) pada validasi unggahan bukti transfer untuk mencegah serangan kehabisan memori server (*denial-of-service*).

### Pengujian Otomatis & Verifikasi Kualitas
- **Pengujian Regresi Keamanan**: Menambahkan 5 pengujian otomatis baru pada `tests/security-pentest.test.ts` untuk memvalidasi penolakan UUID invalid, sanitasi pesan galat 500, penolakan secret produksi kosong, dan pembersihan karakter ASCII kontrol ESC/POS (total 215 unit tests lulus 100%).
- **Pengujian E2E Playwright**: Memastikan seluruh 42 skenario pengujian fungsional Playwright lintas Desktop dan Mobile Chrome lulus tanpa kendala.
- **Pemindaian Rahasia Ganda (Double Secret Scan)**: Memindai seluruh aset statis build klien Next.js, direktori ekspor `out/`, dan aset aplikasi Android APK dengan hasil nol kebocoran data sensitif.

---

## [v1.3.3] - 2026-11-22

Pembaruan keamanan v1.3.3 memperkuat tata kelola hak akses berbasis peran (RBAC) dan mengunci integritas akun Pemilik Usaha (Owner) secara absolut pada seluruh lapisan aplikasi:

### Penegakan Batas Akun Pemilik Tunggal (Strict Single-Owner)
- **Indeks Unik Parsial Database**: Menambahkan indeks unik PostgreSQL `users_single_owner_idx` pada tabel `users` dengan predikat `WHERE role = 'OWNER'`, memastikan secara fisik database Neon hanya dapat menyimpan tepat 1 akun Owner.
- **Validasi Ketat Skema Input (Zod v4)**: Skema `createUserSchema` dan `updateUserSchema` menolak pembuatan akun baru dengan peran Owner maupun promosi peran menjadi Owner, menyertakan pesan penolakan yang jelas.
- **Perlindungan Rute Pengguna API**: Endpoint `POST /api/users` dan `PATCH /api/users/[id]` memblokir percobaan pembuatan Owner tambahan, promosi Kasir menjadi Owner, demosi Owner menjadi Kasir, penonaktifan Owner, dan penghapusan Owner dengan respon `403 Forbidden` serta pencatatan audit log `USER_UPDATE_REJECTED`.
- **Idempotensi Seed Database**: Skema inisialisasi akun memeriksa eksistensi peran Owner sebelum menyisipkan data, mencegah pelanggaran indeks unik saat migrasi ulang.

### Penguatan Batas Hak Akses Kasir (RBAC Boundary Hardening)
- **Proteksi Laporan Omzet Global**: Rute `GET /api/reports` dikunci dengan guard `requireOwner`, memblokir pembacaan data pendapatan toko secara langsung dari akun Kasir.
- **Pembersihan Navigasi & Redireksi Aman**: Menu Laporan Omzet pada antarmuka ditandai `ownerOnly: true`. Akses URL langsung ke `/reports`, `/users`, dan `/audit-logs` oleh akun Kasir langsung dialihkan ke `/dashboard` disertai notifikasi peringatan.
- **Isolasi Dashboard Kasir (Anti-IDOR)**: Rute `GET /api/dashboard` untuk Kasir membatasi metrik omzet dan penerimaan uang fisik hanya pada transaksi milik kasir yang bersangkutan, tanpa menampilkan grafik tren pendapatan global toko.

### Pengujian & Verifikasi Kualitas
- **Pengujian Keamanan RBAC**: Menambahkan uji validasi skema Zod, uji larangan demosi/penonaktifan Owner, dan pengujian matriks izin endpoint Kasir pada `tests/auth-rbac-security.test.ts`.
- **Pengujian E2E Playwright**: Memperluas verifikasi antarmuka manajemen pengguna di Desktop dan Mobile Chrome untuk memastikan peran formulir penambahan terkunci pada Kasir tanpa opsi pilihan Owner.

---

## [v1.3.2] - 2026-11-22

Pembaruan patch v1.3.2 menyempurnakan kenyamanan visual dan tata letak responsif antarmuka:

### Splash Screen & Transisi Masuk
- **Perlambatan Pre-Login Splash**: Memperpanjang ritme fade-in (500ms), fase tahan/progress bar halus 0% -> 100% (~2.050ms), dan fade-out (450ms) dengan total durasi ~2,5 detik agar identitas aplikasi nyaman dibaca.
- **Stabilitas Siklus Hidup**: Menjamin timer transisi tidak ter-reset saat pengguna berinteraksi dengan kolom input, tetap mendukung ketukan untuk lewati (*tap-to-skip*), dan mode *reduced-motion*.

### Tata Letak Antarmuka & Drawer Mobile
- **Pemisahan Zona Tombol Tutup & Badge Peran**: Memberikan padding kanan aman (`pr-12`) pada header drawer mobile 'Menu & Pengaturan' dan menempatkan badge peran (`OWNER`/`KASIR`) di sebelah nama pengguna pada kartu profil di sisi kiri.
- **Zero Overlap & Touch Target**: Menghilangkan tumpang tindih antara tombol silang `X` dan badge akun (0px overlap), memperbesar target sentuh tombol tutup ke 40x40px (`size-10`), serta menambahkan umpan balik tekan `active:scale-[0.96]`.

---

## [v1.3.1] - 2026-11-22

Pembaruan patch v1.3.1 berfokus pada penguatan transaksi database atomik POS, sinkronisasi invalidasi cache katalog dan kalkulator cepat, eliminasi transisi tidak terarah demi performa rendering GPU 60fps, pengamanan isolasi kredensial uji E2E tanpa fallback, serta restrukturisasi penamaan berkas pengujian berbasis fitur.

### Database & Transaksi POS Atomik
- **Row-Level Locking Pembayaran Pesanan**: Endpoint `/api/orders/[id]/payments` dilindungi kunci baris eksplisit `.for("update")` dan konfirmasi sisa tagihan untuk mencegah *race condition* pembayaran ganda secara bersamaan.
- **Katalog Produk Cetak Inti**: Sinkronisasi seed katalog menambahkan varian produk spanduk standar (`Banner Flexi 280gr Standard` dan `Banner Flexi 340gr Semi-Korcin`) ke database secara aman dan *idempotent*.

### Sinkronisasi Kontrak & Mutasi State
- **Invalidasi Cache Menyeluruh**: Mutasi tambah/edit produk di halaman katalog kini menginvalidasi cache kueri kategori dan finishing kalkulator secara langsung, menjamin ketersediaan bahan pembanding seketika di Kalkulator Cepat maupun POS.

### Performa Antarmuka & GPU Transitions
- **Pembersihan `transition-all`**: Menghapus seluruh pemakaian transisi global yang memicu *layout thrashing* di halaman produk, pengaturan, modal pelanggan, dan kalkulator item POS, digantikan dengan transisi selektif ramah GPU (`transition-transform`, `transition-colors`, `transition-opacity`).
- **Pratinjau Struk Statis**: Kontainer pratinjau struk thermal (`ReceiptView.tsx`) dijaga 100% statis tanpa transisi demi kepastian tata letak cetak Bluetooth ESC/POS.

### Arsitektur Pengujian & Sanitasi Rahasia
- **Penamaan Berkas Pengujian Berbasis Fitur**: Merapikan 6 berkas uji bernomor fase menjadi modul berbasis kemampuan domain (`auth-rbac-security`, `products-settings`, `pos-orders`, `reports-dashboard-audit`, `capacitor-mobile`, `security-pentest`).
- **Isolasi Variabel Lingkungan E2E**: Menghapus fallback kredensial default dari script pengujian Playwright dan menggantikannya dengan pembacaan terisolasi dari variabel lingkungan lokal via `dotenv`.

---

## [v1.3.0] - 2026-11-22

Rilis minor v1.3.0 menghadirkan sistem Splash Screen pra-login dan pasca-login personal, animasi bertahap (stagger) pada halaman masuk, dashboard toko interaktif dengan visualisasi data halus, indikator pemuatan data kontekstual di seluruh modul, serta umpan balik mikro pada tombol dan navigasi dengan kepatuhan penuh terhadap standar aksesibilitas dan preferensi gerak pengguna (*prefers-reduced-motion*).

### Sistem Splash Screen & Transisi Masuk Personal
- **Splash Screen Pra-Login (`PreLoginSplash.tsx`)**:
  - Menampilkan pembuka aplikasi dengan emblem KG dan efek skala halus selama ~1,25 detik saat pengguna pertama kali membuka tab atau aplikasi.
  - Memori sesi (*sessionStorage*) mencegah tampilan berulang pada tab yang sama, serta mendukung lewati instan melalui ketukan atau klik layar.
- **Splash Screen Pasca-Login Personal (`PostLoginSplash.tsx`)**:
  - Menampilkan sapaan nama pengguna terotentikasi, lencana peran akun (OWNER atau KASIR), dan animasi status progres persiapan ruang kerja.
  - Prefetch paralel data esensial (`/api/dashboard`, `/api/products`, `/api/settings/public`) saat transisi berjalan untuk memastikan halaman tujuan langsung terisi data tanpa jeda.

### Animasi Halaman Masuk & Interaksi Mikro
- **Stagger Entrance Form Login**:
  - Urutan kemunculan bertahap dari emblem, judul, kartu form, kolom username, password, hingga tombol aksi menggunakan kurva percepatan GPU-accelerated.
  - Efek goyangan mikro (*micro-shake*) kartu saat terjadi kegagalan autentikasi tanpa memuat ulang halaman.
  - Transisi pergantian ikon lihat/sembunyikan password yang mulus menggunakan mode wait AnimatePresence.
- **Umpan Balik Tekan & Gerakan Ringan**:
  - Seluruh tombol utama dan navigasi dilengkapi efek active scale 0.96 saat ditekan untuk responsivitas sentuh yang mantap.
  - Tab navigasi mobile dan menu sidebar menggunakan transisi warna dan skala ikon yang spesifik tanpa pemborosan komputasi layout.

### Dashboard Interaktif & Metrik Dinamis
- **Animasi Angka Metrik (`AnimatedNumber.tsx`)**:
  - 4 kartu metrik utama (Omzet, Uang Masuk, Sisa Tagihan DP, dan Antrean Produksi) menghitung naik secara halus menuju nilai aktual menggunakan *cubic ease-out*.
  - Font `JetBrains Mono` berformat `tabular-nums` memastikan lebar angka konsisten tanpa getaran tata letak (Zero CLS).
- **Indikator Filter Periode Bergerak**:
  - Penanda aktif filter periode (Hari Ini, 7 Hari, 30 Hari) bergeser secara fisik menggunakan animasi layoutId bersama.
- **Visualisasi Grafik & Progres Bar GPU**:
  - Grafik tren penjualan Recharts dilengkapi durasi animasi masuk 450ms.
  - Baris produk terlaris menggunakan animasi lebar berbasis `scaleX` GPU-accelerated dari sisi kiri (`origin-left`) tanpa memicu re-layout browser.

### Indikator Pemuatan Data Kontekstual di Seluruh Modul
- **Komponen Loading Seragam (`PageLoadingBanner.tsx`)**:
  - Banner status pemuatan data yang ringkas, bersih, dan kontekstual dipasang pada seluruh skeleton modul (Dashboard, Kasir POS, Katalog Produk, Pesanan, Pelanggan, Laporan, Pengaturan Toko, Pengguna, dan Audit Log).
  - Garis pembaruan latar belakang (*top shimmer bar*) muncul di tepi paling atas layar saat data disegarkan tanpa menutupi konten kerja pengguna.

### Aksesibilitas & Penjaminan Mutu
- **Dukungan Penuh Prefers-Reduced-Motion**:
  - Konfigurasi `MotionConfig reducedMotion="user"` secara global menonaktifkan seluruh animasi gerak dan beralih ke rendering instan saat pengguna mengaktifkan mode hemat gerak di sistem operasi mereka.
  - Halaman pratinjau struk (`ReceiptView.tsx`) dijaga 100% statis demi kepastian cetak printer thermal.
- **Validasi Uji Otomatis & Keamanan**:
  - Pengujian baru Playwright E2E (`motion-and-splash.spec.ts`) memvalidasi alur splash pra-login, login sukses, interaksi dashboard, dan mode reduced-motion.
  - Seluruh 197 pengujian unit Vitest dan 41 pengujian E2E Playwright lulus 100% tanpa kegagalan.
  - Kompilasi ganda (Web Next.js & Android APK sync) lulus 100% dengan status Zero Secret Leak.

---

## [v1.2.1] - 2026-11-21

Pembaruan antarmuka pemilih produk pada Kalkulator Cepat: penggantian dropdown sederhana dengan katalog visual interaktif bergaya POS, pencarian instan nama produk & SKU, filter kategori dinamis, perbaikan sinkronisasi data produk aktif, penyelarasan jarak header sheet, dan validasi mutu menyeluruh.

### Peningkatan Pemilih Produk Bergaya Katalog / POS
- **Katalog Visual Interaktif (`QuickCatalogPicker.tsx`)**:
  - Menggantikan elemen `<select>` polos dengan antarmuka katalog visual yang menampilkan seluruh produk aktif dari database.
  - Kartu produk dilengkapi thumbnail foto beresolusi aman, nama produk, kategori, badge tipe perhitungan (Meteran atau Satuan), harga dasar berformat `tabular-nums`, serta penanda ketersediaan harga grosir bertingkat.
  - Mendukung kartu ringkas produk terpilih (*compact selected card*) saat picker ditutup, lengkap dengan tombol **Ganti** untuk membuka kembali katalog pencarian.
- **Pencarian Cepat & Filter Kategori**:
  - Kolom pencarian teks instan yang menyaring produk berdasarkan nama dan kode SKU dengan tombol reset satu klik.
  - Deretan filter kategori berbentuk pil gulir horizontal yang memuat seluruh kategori aktif beserta jumlah produk pada masing-masing kategori.
  - Tampilan *empty state* yang informatif saat pencarian tidak menemukan hasil, disertai tombol reset filter cepat.

### Perbaikan Sinkronisasi Katalog & Tata Letak Header
- **Penyelarasan Cache & Data Produk Aktif**:
  - Memperbaiki akar masalah daftar produk terbatas dengan menyelaraskan query key ke `["products", "active"]` menggunakan endpoint `/api/products?includeInactive=false`.
  - Menambahkan penyegaran otomatis saat panel kalkulator dibuka (`refetchProducts` pada state `isOpen`), serta invalidasi query reaktif pada halaman Master Produk saat ada penambahan, pengeditan, atau penghapusan produk.
- **Penyelarasan Tata Letak Header Sheet**:
  - Menambahkan padding kanan protektif (`pr-9 sm:pr-10`) pada header panel kalkulator agar tombol **Reset** tidak bertabrakan atau menempel dengan tombol tutup silang (`×`) di pojok kanan atas.

### Penjaminan Mutu & Uji Regresi
- **Uji Otomatis & Keamanan**:
  - Seluruh 197 pengujian unit Vitest lulus 100% tanpa regresi.
  - Pengujian E2E Playwright (`quick-calculator.spec.ts`) berhasil memvalidasi alur katalog visual, pencarian produk, pergantian bahan, mode komparasi, dan pengiriman ke keranjang kasir POS.
  - Pengecekan build ganda (Web System & Android APK assets) lulus 100% dengan status Zero Secret Leak.

---

## [v1.2.0] - 2026-11-21

Pembaruan fitur Kalkulator Cepat & Komparasi Bahan: penambahan lembar cek harga instan dari halaman mana saja, simulasi perbandingan 2 bahan percetakan berdampingan, salin draf estimasi WhatsApp, handoff item ke keranjang POS anti-timpa, pemicu global (shortcut keyboard Alt+K, tombol Top Bar desktop, dan FAB mobile adaptif), serta perbaikan ketahanan koneksi database pool.

### Fitur Kalkulator Cepat & Cek Harga Instan
- **Akses Langsung Tanpa Pindah Halaman**:
  - Menyediakan lembar kalkulator cepat (`QuickCalculatorSheet.tsx`) yang dapat dipanggil seketika dari halaman mana pun melalui shortcut keyboard `Alt+K` (atau `Option+K` di macOS), tombol **Cek Harga** pada Top Bar desktop, serta tombol mengambang bulat (FAB) di perangkat mobile.
  - Tampilan responsif adaptif: membuka panel samping kanan (`slide-over`) pada layar komputer dan membuka lembar bawah (`bottom sheet`) dengan batasan tinggi aman pada layar ponsel.
- **Kalkulasi Akurat Memakai Rumus Tunggal**:
  - Memakai ulang fungsi inti perhitungan harga dari `src/lib/calculator/pricing.ts` (`calculateOrderItem`), menjamin hasil hitung selalu identik dengan kalkulator transaksi kasir tanpa duplikasi rumus.
  - Mendukung produk cetak meteran (`AREA`) dengan input dimensi (panjang dan lebar dalam meter maupun sentimeter beserta preset ukuran populer seperti 1×1, 2×1, 3×1, dan 4×1), pembulatan luas, luas minimum order, dan kuantitas pesanan.
  - Mendukung produk satuan (`UNIT`) dengan stepper jumlah kuantitas pesanan.
  - Mendukung pilihan finishing dinamis berbasis biaya datar, per kuantitas, maupun per luas meter persegi.

### Perbandingan 2 Bahan Berdampingan
- **Simulasi Komparasi Bahan Sejenis**:
  - Fitur toggle **Bandingkan 2 Bahan** yang memfilter pilihan Bahan Pembanding (Opsi B) agar selalu satu jenis tarif dengan Bahan Utama (Opsi A) (misal bahan meteran dibanding bahan meteran).
  - Menampilkan kartu perbandingan berdampingan lengkap dengan nama produk, tarif dasar, rincian finishing, dan estimasi total biaya.
  - Analisis selisih harga otomatis dengan penanda visual warna hijau dan badge **Lebih Hemat** pada opsi bahan yang lebih ekonomis.
  - Tombol aksi mandiri di setiap kartu (**Pilih Opsi A ke POS** dan **Pilih Opsi B ke POS**) untuk memudahkan kasir menentukan pilihan terbaik bersama pelanggan.

### Ekspor Estimasi WhatsApp & Handoff Keranjang POS
- **Format Pesan WhatsApp Siap Kirim**:
  - Modul pembuat pesan `src/lib/calculator/estimate-text.ts` yang menyusun rincian spesifikasi cetak, breakdown biaya, dan catatan syarat cetak dalam format pesan WhatsApp rapi.
  - Mendukung salin teks estimasi bahan tunggal maupun teks perbandingan dua bahan lengkap dengan analisis selisih harga.
  - Mekanisme penyalinan teks clipboard yang aman dengan fallback textarea untuk browser WebView Android.
- **Jembatan Keranjang Kasir POS (Anti-Timpa)**:
  - Modul jembatan `src/lib/pos/cart-bridge.ts` yang menyalurkan item hasil kalkulasi ke keranjang POS via browser custom event atau penyimpanan sesi aman.
  - Logika penerimaan di `src/app/(dashboard)/pos/page.tsx` memastikan item baru ditambahkan (*append*) ke daftar keranjang kasir tanpa menghapus item yang sudah ada sebelumnya.

### Ketahanan Koneksi Database & Penjaminan Kualitas
- **Pemulihan Otomatis Koneksi Pool Neon**:
  - Menambahkan penanganan event error pada koneksi pool database Neon Serverless (`src/db/index.ts`) agar instans cache pool otomatis di-reset saat koneksi WebSocket idle ditutup server, mencegah kegagalan query berulang pada sesi jangka panjang.
- **Uji Unit & E2E Komprehensif**:
  - Pengujian unit `src/lib/calculator/estimate-text.test.ts` dan `src/lib/pos/cart-bridge.test.ts` memvalidasi akurasi teks WhatsApp dan integritas jembatan keranjang (197 pengujian unit Vitest lulus 100%).
  - Pengujian otomatis Playwright E2E `tests/e2e/quick-calculator.spec.ts` memvalidasi alur desktop, shortcut Alt+K, FAB mobile, serta handoff anti-timpa keranjang kasir (33 skenario Playwright lulus 100%).
  - Verifikasi keamanan ganda pada folder `.next/static` dan `out/` membuktikan nol kebocoran kredensial (Zero Secret Leak).

---

## [v1.1.3] - 2026-11-21

Pembaruan deteksi pembaruan aplikasi (In-App Update Notification): perbaikan endpoint versi server dengan bypass cache, penyeragaman URL target APK, sinkronisasi reactive modal lintas instance, eliminasi stale state pada tombol periksa pembaruan, serta fallback cerdas tahan rate limit GitHub API.

### Perbaikan Endpoint Deteksi Pembaruan Server
- **Bypass Cache & Respon Dinamis Real-Time**:
  - Menetapkan `export const dynamic = "force-dynamic"` pada `src/app/api/app/version/route.ts` agar endpoint tidak pernah di-cache statis saat build Next.js.
  - Mendukung parameter query `?force=1` dan `?refresh=1` dengan header `Cache-Control: no-store, no-cache, must-revalidate` untuk melewati cache in-memory server dan WebView saat pengguna menekan tombol periksa pembaruan secara manual.
  - Menetapkan header `Cache-Control: no-store` pada respon normal agar WebView Android tidak menyimpan cache basi dari respons sebelumnya.
- **Dual-Source Resilience & Fallback Tahan Rate-Limit**:
  - Menyertakan header autentikasi `Authorization: Bearer` jika `GITHUB_TOKEN` tersedia.
  - Menyediakan fallback otomatis berbasis `APP_VERSION` server, ekstraksi catatan rilis dari berkas `CHANGELOG.md` lokal, dan URL unduh APK rilis resmi saat GitHub API mengalami pembatasan kuota (status 403) atau tidak dapat dijangkau.

### Perbaikan Client APK & Web
- **Target URL APK & Header Platform Akurat**:
  - Memperbaiki `resolveApiUrl` pada `src/lib/api/client.ts` agar selalu mengarahkan permintaan APK ke domain backend produksi `https://ksatriagraphx.vercel.app` dengan header `X-Client-Platform: apk` dan `cache: "no-store"`.
- **Sinkronisasi Reaktif Dialog Pembaruan**:
  - Mengintegrasikan module-level subscriber pada `src/hooks/useAppUpdate.ts` sehingga perubahan status buka/tutup modal tersinkronisasi secara instan antara komponen tata letak `AppShell.tsx` dan halaman pengaturan `settings/page.tsx`.
- **Eliminasi Stale State & Pembedaan Status yang Jujur**:
  - Memperbarui fungsi `checkForUpdate` agar mengembalikan objek hasil terstruktur (`UpdateCheckOutcome`) dengan 3 status terpisah: `"update-available"`, `"up-to-date"`, dan `"error"`.
  - Tombol **Periksa Pembaruan** di `src/app/(dashboard)/settings/page.tsx` mengambil keputusan tampilan toast dan pembukaan modal langsung dari nilai yang dikembalikan, tanpa bergantung pada React state lama.
  - Menampilkan pesan error yang jujur saat koneksi internet gagal dan tidak pernah menampilkan status keliru seolah-olah aplikasi sudah versi mutakhir.

### Penjaminan Kualitas & Pengujian Otomatis
- **Uji Unit & E2E Komprehensif**:
  - Memperkuat pengujian unit `src/app/api/app/version/route.test.ts` dan `src/lib/version.test.ts` untuk memvalidasi preflight CORS, bypass cache `?force=1`, server fallback, dan perbandingan SemVer presisi.
  - Menambahkan suite pengujian E2E Playwright `tests/e2e/app-update.spec.ts` yang memverifikasi pembukaan modal otomatis, interaksi tombol "Nanti Saja", pemeriksaan manual, dan penanganan error jaringan pada Desktop Chrome dan Mobile Chrome.
  - Seluruh 29 skenario pengujian E2E Playwright lulus 100%.

---

## [v1.1.2] - 2026-11-21

Pembaruan stabilitas dan audit menyeluruh operasi CRUD: perbaikan upload foto produk pada store Vercel Blob privat, perbaikan skema validasi tambah dan edit produk, normalisasi input pada 6 modul inti, serta penambahan rangkaian uji regresi otomatis di Web dan Android APK.

### Perbaikan Upload Foto Produk & Vercel Blob
- **Dukungan Private Blob Store & Penanganan Error Transparan**:
  - Memperbaiki pengunggahan foto di `src/lib/storage/blob.ts` untuk menangani token Blob bertipe Private Store (`Cannot use public access on a private store`).
  - Menambahkan kelas error terarah `MissingBlobTokenError` (`BLOB_TOKEN_MISSING`) dan `PrivateBlobStoreError` (`BLOB_STORE_PRIVATE`) dengan URL proxy unduh fallback `/api/uploads/product-image?key=...`.
  - Memetakan respon error di `src/app/api/uploads/product-image/route.ts` secara akurat: status `503` saat token belum disetel atau store privat, `422` saat gagal proses Sharp, serta `401`/`403` saat autentikasi tidak memadai.

### Perbaikan Validasi Produk & Normalisasi Data
- **Penanganan Properti `id` & Data Parsial**:
  - Mengizinkan field `id` opsional/nullable pada `createProductSchema` dan `updateProductSchema` (`src/lib/validators/product.ts`) agar form tambah dan edit tidak lagi ditolak oleh aturan Zod `.strict()`.
  - Normalisasi otomatis string kosong `""` menjadi `null` untuk `sku`, `description`, `imageUrl`, dan `imageKey`.
  - Mengonversi nilai numerik menggunakan `z.coerce.number()` pada field harga dan luas minimal.
  - Memformat pesan validasi Zod menjadi kalimat Bahasa Indonesia yang jelas dan spesifik per field alih-alih pesan generik.
  - Memperbarui komponen `ProductFormModal.tsx` agar menyaring payload sebelum pengiriman ke API.

### Audit Validasi & Penyelarasan Kontrak 6 Modul Lain
- **Konsistensi Operasi CRUD Lintas Fitur**:
  - **Kategori**: Normalisasi slug otomatis dari nama dan penanganan string kosong pada `src/lib/validators/category.ts`.
  - **Finishing**: Konversi tipe angka otomatis pada `defaultPrice` dan toleransi properti `id`.
  - **Pelanggan**: Normalisasi format nomor WhatsApp, konversi string kosong menjadi `null`, dan pemisahan field pada query update Drizzle.
  - **Pesanan / POS**: Normalisasi nomor telepon pemesan, perkiraan waktu siap, dan catatan transaksi.
  - **Pengaturan Toko**: Sanitasi payload update agar tidak meneruskan field `id` ke Drizzle `.set()`.
  - **Manajemen Pengguna**: Normalisasi email kosong menjadi `null` dan toleransi properti `id`.

### Penjaminan Kualitas & Pengujian Otomatis
- **Uji Integrasi & E2E Komprehensif**:
  - Menambahkan suite pengujian integrasi Vitest `tests/crud-full-audit.test.ts` (190 test case lulus 100%).
  - Menambahkan suite pengujian E2E Playwright `tests/e2e/products-and-crud.spec.ts` yang menguji siklus lengkap Tambah -> Edit -> Verifikasi -> Hapus pada viewport Desktop Chrome (1280x800) dan Mobile Chrome (375x812).
  - Seluruh 25 pengujian E2E Playwright dan validasi build statis untuk aset APK Capacitor lulus tanpa celah.

---

## [v1.1.1] - 2026-11-21

Rilis pembaruan antarmuka dan kestabilan sistem: penyempurnaan sistem tema OKLCH (Mode Terang & Mode Gelap), penyeragaman lebar kontainer seluruh halaman, perbaikan posisi sticky footer sidebar desktop, serta penyelarasan gaya notifikasi toast.

### Penyempurnaan Tema & Desain Token OKLCH
- **Palet Warna OKLCH Presisi**:
  - Memutakhirkan `src/app/globals.css` dengan token warna OKLCH modern (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` s.d. `--chart-5`, dan `--sidebar-*`) untuk Mode Terang dan Mode Gelap.
  - Memastikan kontras tajam sesuai WCAG AA tanpa warna hardcoded (`slate-*`/`blue-*`), serta radius seragam `0.375rem` (`rounded-lg`).
  - Mengintegrasikan variabel font Next.js `--font-inter` dan `--font-jetbrains-mono` secara konsisten pada elemen dasar `layout.tsx` dan `globals.css`.

### Penyeragaman Lebar Kontainer Halaman & Layout
- **Eliminasi Lompatan Lebar Antarhalaman**:
  - Menetapkan batas lebar tunggal `max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6` langsung di dalam kontainer utama `AppShell.tsx`.
  - Membersihkan pembatas lebar lokal (`max-w-4xl`, `max-w-5xl`, `max-w-7xl`) dan padding vertikal berlebih dari seluruh 11 halaman operasional (`/dashboard`, `/pos`, `/orders`, `/orders/detail`, `/products`, `/customers`, `/customers/detail`, `/reports`, `/settings`, `/users`, dan `/audit-logs`), memastikan transisi antarhalaman sejajar dan mulus.
- **Perbaikan Posisi Sticky Footer Sidebar Desktop**:
  - Mengisolasi tinggi sidebar kiri desktop dengan `lg:sticky lg:top-0 lg:h-dvh` dan memisahkan area navigasi tengah (`overflow-y-auto`) dengan footer profil pengguna/versi (`shrink-0`).
  - Informasi akun pengguna, tombol keluar sesi, dan badge versi kini selalu tampil terkunci di dasar layar desktop tanpa tergulung saat halaman panjang di-scroll.

### Penyelarasan Komponen Sekunder & Notifikasi
- **Harmonisasi Modal & Tab Produk**:
  - Menyelaraskan seluruh modal tambah/edit dan dialog konfirmasi hapus pada `CategoryTab.tsx`, `FinishingTab.tsx`, dan `ProductFormModal.tsx` menggunakan semantic tokens dan backdrop modern.
- **Styling Notifikasi Toast Sonner**:
  - Menyelaraskan komponen `<Toaster />` di `QueryProvider.tsx` dengan variabel semantik tema (`var(--popover)`, `var(--popover-foreground)`, `var(--border)`, dan `var(--radius)`).

---

## [v1.1.0] - 2026-11-21

Rilis pembaruan minor utama untuk perombakan antarmuka pengguna (UI/UX Overhaul), implementasi sistem tema ganda (Mode Gelap & Mode Terang), navigasi responsif tunggal anti-double navbar, perombakan menyeluruh halaman Dashboard, transisi layar mulus (shaped skeletons anti-blank screen), serta sistem notifikasi pembaruan aplikasi langsung (In-App Updater).

### Arsitektur UI/UX & Design System Baru
- **Pondasi Design System shadcn/ui & Dual-Theme (Slate Light & Slate Dark)**:
  - Mengintegrasikan fondasi komponen modular `shadcn/ui` berbasis primitif Radix UI (`dialog`, `sheet`, `dropdown-menu`, `tabs`, `switch`, `button`, `card`, `badge`, `skeleton`, `separator`, `table`) dan Tailwind CSS v4 CSS-first.
  - Menerapkan sistem tema ganda **Slate Light & Slate Dark** melalui `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) dengan semantic tokens CSS variables OKLCH/HSL, menghasilkan kontras tajam WCAG AA ($\ge 4.5:1$) dan bebas kedipan (*zero FOUC*).
  - Menyediakan komponen `ThemeToggle` 1-klik di Desktop Top Bar, Mobile Top Bar, dan halaman Pengaturan Toko.
  - Memadukan font Google **Inter** sebagai tipografi utama antarmuka dan **JetBrains Mono** untuk data teknis / nomor nota, ter-bundle otomatis di Web dan static export APK.
  - Menetapkan kelas `tabular-nums` pada seluruh angka keuangan, nominal Rupiah, persentase margin, dan kuantitas inventaris.

### Navigasi Responsif Tunggal (Anti-Double Navbar)
- **Eliminasi Tombol Hamburger & Bottom Bar Ganda pada Mobile**:
  - Menghapus tombol hamburger di topbar mobile, menggantikannya dengan arsitektur navigasi tunggal:
    - **Desktop (`>= 1024px`)**: Fixed Left Sidebar (`240px`) + Sticky Top Bar ramping (`56px`).
    - **Mobile & Android APK (`< 1024px`)**: Top Bar ultra-ringkas + Bottom Navigation Bar (5 tab) + Bottom Sheet "Menu" dari bawah.
  - Bottom Sheet "Menu" mengelompokkan navigasi sekunder sesuai peran RBAC (`Pelanggan`, `Laporan Omzet`, `Pengaturan Toko` / `Printer Bluetooth` Kasir di APK, `Audit Log`, `Kelola Pengguna` [eksklusif Web + Owner], status versi terpasang, serta tombol Keluar Sesi).

### Overhaul Total Halaman Dashboard
- **Dashboard Ringkasan Toko Eksekutif Minimalis**:
  - Filter rentang waktu cepat: Hari Ini (`1d`), 7 Hari (`7d`), dan 30 Hari (`30d`) dengan sinkronisasi API `/api/dashboard?range=...`.
  - 4 Kartu KPI terstruktur berfont `tabular-nums` dan indikator delta persentase vs periode sebelumnya: Total Omzet Penjualan, Uang Masuk Aktual, Total Piutang (DP), dan Antrean Produksi.
  - Grid analitik proporsional (desktop 2/3 : 1/3, mobile bertumpuk):
    - **Kiri (2/3)**: Grafik Tren Omzet AreaChart (Recharts) responsif adaptif tema terang dan gelap.
    - **Kanan (1/3)**: Panel Top 5 Produk Terlaris dengan visualisasi progres dan status antrean produksi.
  - Tabel dan daftar Pesanan Terbaru yang responsif: tabel penuh di desktop dan kartu bertumpuk rapi di mobile dengan tautan langsung ke detail transaksi.

### Konsistensi Visual Lintas Halaman & Transisi Halus (Smooth Loading)
- **Shaped Skeletons Anti-Blank Screen (CLS = 0.00)**:
  - Menggantikan pola `return null` saat verifikasi sesi dengan `AppShellSkeleton` menyeluruh.
  - Menyediakan skeleton berproporsi presisi untuk seluruh halaman operasional: `DashboardSkeleton`, `PosCatalogSkeleton`, `OrdersSkeleton`, `OrderDetailSkeleton`, `CustomersSkeleton`, `CustomerDetailSkeleton`, `ReportsSkeleton`, dan `AuditLogsSkeleton`.
  - Tuning TanStack Query: `staleTime: 30_000`, `gcTime: 300_000`, `refetchOnWindowFocus: false`, dan `placeholderData: keepPreviousData` untuk eliminasi kedipan saat berpindah tab atau memfilter tabel.
  - Memutakhirkan seluruh halaman (`/pos`, `/orders`, `/orders/detail`, `/customers`, `/customers/detail`, `/reports`, `/settings`, `/users`, `/audit-logs`, `/login`) ke semantic tokens tema ganda.

### Keterangan Versi Aplikasi & In-App Updater
- **Single Source of Truth Keterangan Versi**:
  - Keterangan versi terpasang di 4 titik strategis: Footer Login, Footer Sidebar Desktop, Footer Bottom Sheet Mobile, dan Kartu "Tentang Aplikasi & Pembaruan" di halaman Pengaturan.
- **Sistem Notifikasi Pembaruan In-App**:
  - Endpoint `GET /api/app/version` dengan in-memory server cache 5 menit (`s-maxage=300`) ke GitHub Releases API, resolusi CORS native APK (`https://localhost`), sanitasi domain anti open-redirect, dan offline fallback aman 200 OK.
  - Hook `useAppUpdate` & komponen dialog `UpdateNoticeModal` dengan perbandingan semver presisi, parser changelog aman (0 `dangerouslySetInnerHTML`), tombol aksi platform (Unduh APK di Android / Muat Ulang di Web), dan opsi "Nanti Saja" dengan penyimpanan state dismissal lokal per versi.
  - Tombol manual "Cek Pembaruan" pada Pengaturan Toko dengan feedback instan Sonner toast.

### Integritas & Keamanan Sistem (Zero Regression)
- Menjaga keutuhan 4-Layer Web-Only Guard di `/api/users/**` (tetap memblokir HTTP 403 untuk akses APK/Bearer).
- Menjaga kontrak autentikasi native APK (`https://localhost`), upload private Vercel Blob, transaksi atomik ACID POS, dan printer thermal Bluetooth ESC/POS kasir.

---

## [v1.0.3] - 2026-11-21

Rilis pembaruan kritis untuk perbaikan pemrosesan upload foto produk pada private store Vercel Blob, pemulihan transaksi atomik database pada checkout POS, serta integrasi sistem notifikasi global Sonner toast pada Web dan Android APK.

### Perbaikan Kritis & Stabilitas Sistem
- **Perbaikan Upload Foto Produk Private Vercel Blob**:
  - Mengimplementasikan fallback otomatis ke mode `access: "private"` pada `src/lib/storage/blob.ts` saat store Vercel Blob dikonfigurasi sebagai private store, guna mencegah error penolakan `Cannot use public access on a private store`.
  - Menyediakan proxy streaming aman via handler `GET /api/uploads/product-image?key=...` menggunakan method `get()` dari `@vercel/blob` dengan caching browser jangka panjang (`Cache-Control: public, max-age=31536000, immutable`) dan resolusi MIME otomatis.
  - Memperbarui skema validator `src/lib/validators/product.ts` dan konfigurasi CSP di `next.config.ts` untuk mengizinkan domain `*.private.blob.vercel-storage.com` serta path proxy lokal.
  - Mendaftarkan paket `sharp` pada `serverExternalPackages` di `next.config.ts` dan menyematkan `export const runtime = "nodejs"` pada route upload gambar untuk memastikan pemrosesan WebP berjalan tanpa kendala di Node.js runtime.
  - Memperbaiki komponen `src/components/products/ProductImageUploader.tsx` agar langsung menampilkan preview gambar yang diunggah dan mereset error state saat memilih file baru.
- **Pemulihan Transaksi Atomik Checkout POS**:
  - Merefaktor koneksi database di `src/db/index.ts` dari driver stateless `drizzle-orm/neon-http` ke `Pool` dari `@neondatabase/serverless` dengan `drizzle-orm/neon-serverless`.
  - Mengatasi error fatal `No transactions support in neon-http driver` saat pemanggilan `db.transaction()` pada simpan nota kasir (`POST /api/orders`) dan pencatatan pembayaran (`POST /api/orders/[id]/payments`).
  - Menjamin integritas ACID transaksi simpan nota: nomor invoice unik berurutan, snapshot produk, snapshot finishing, dan pembayaran awal tersimpan secara atomik.

### Peningkatan Pengalaman Pengguna (UX)
- **Sistem Notifikasi Global (Toast) dengan Sonner**:
  - Menginstal dependensi `sonner` dan menyematkan komponen `<Toaster richColors closeButton duration={3500} />` pada `src/components/providers/QueryProvider.tsx` dengan posisi adaptif (`top-right` pada desktop, `top-center` dengan safe-area inset pada mobile).
  - Mengintegrasikan notifikasi toast feedback sukses, info, peringatan, dan error pada seluruh alur pengguna utama:
    - **Autentikasi**: Login dan Logout di Web & Android APK.
    - **POS & Kasir**: Tambah/hapus/edit item keranjang, checkout nota sukses, serta error validasi simpan nota.
    - **Katalog Produk & Finishing**: Tambah produk, edit produk, hapus produk, upload foto, kategori, dan opsi finishing.
    - **Manajemen Transaksi & Pembayaran**: Update status pengerjaan, pelunasan sisa tagihan/DP nota.
    - **Manajemen Pelanggan & Pengguna**: Tambah dan perbarui data pelanggan serta manajemen akun pengguna.
    - **Pengaturan & Printer Kasir**: Simpan konfigurasi toko, koneksi bluetooth printer thermal ESC/POS, dan cetak struk nota.
    - **Laporan Penjualan**: Filter rentang tanggal dan export rekapitulasi CSV.

---

## [v1.0.2] - 2026-11-21

Rilis pembaruan produksi resmi untuk pemulihan menyeluruh autentikasi Android APK, sinkronisasi kredensial database Neon live, pengerasan ProGuard, dan otomasi rilis GitHub Actions.

### Perbaikan Kritis
- **Resolusi Jalur Login Android APK Produksi**: Menyesuaikan resolusi endpoint autentikasi pada `src/app/(auth)/login/page.tsx` menggunakan `resolveApiUrl("/api/auth/login", isNative)` sehingga request login dari native WebView Capacitor (`https://localhost`) terarah tepat ke server produksi (`https://ksatriagraphx.vercel.app`).
- **CORS Preflight & Kontrak Token APK**: Menerapkan respon instan `204 No Content` pada preflight global `OPTIONS` di `src/middleware.ts` untuk origin `https://localhost` dan `capacitor://localhost`, serta mengembalikan payload JSON token `{ accessToken, refreshToken, user }` khusus platform native tanpa ketergantungan cookie.
- **Pengecualian CSRF untuk Origin Native**: Mengesampingkan validasi Origin/Referer CSRF berbasis browser pada `src/lib/security/csrf.ts` khusus untuk request resmi dari origin native Capacitor (`https://localhost` dan `capacitor://localhost`).
- **Diagnosa Error Login Informatif**: Memperjelas pesan error pada halaman login kasir/pengguna (HTTP 401: Kredensial tidak valid; HTTP 429: Batas percobaan terlampaui; HTTP 403: Pelanggaran kebijakan; kode `NET`: Gangguan koneksi internet atau CORS; kode `STORAGE`: Kegagalan penyimpanan token lokal).

### Keamanan & Infrastruktur
- **Sinkronisasi Environment Bebas Konflik**: Memisahkan berkas konfigurasi antara `.env.local` (lingkup lokal lengkap) dan `.env.vercel` (bebas dari variabel `DATABASE_URL` dan `BLOB_READ_WRITE_TOKEN` agar tidak menimpa integrasi auto-connect Neon & Vercel Blob di dashboard Vercel).
- **Idempotent Seed & Pembaruan Kredensial Owner**: Menyempurnakan `src/db/seed.ts` agar memperbarui hash password Owner (`bcryptjs` cost >= 12), memastikan akun aktif (`isActive = true`), mereset batas percobaan gagal dan status penguncian, serta merevoke sesi lama secara aman.
- **Hardening ProGuard/R8 Android**: Menambahkan aturan eksplisit pada `android/app/proguard-rules.pro` untuk mencegah optimasi R8 memotong paket `@aparajita/capacitor-secure-storage` dan plugin `ThermalPrinterPlugin`.

### Peningkatan & Rilis
- **Otomasi Catatan Rilis & Checksum SHA-256**: Mengintegrasikan script `scripts/extract-changelog.mjs` ke workflow `.github/workflows/android-apk.yml` untuk memublikasikan release notes dinamis, panduan instalasi, dan tabel checksum SHA-256 pada GitHub Releases.
- **Pembersihan Boilerplate & Dead Code**: Menghapus file templat Next.js yang tidak terpakai, menjaga kebersihan bundle rilis, dan memverifikasi proteksi zero secret leak pada seluruh aset publik client.

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
