# Panduan Build Android APK — Ksatria Graphx (PRD v1.1.0)

Dokumen ini memuat panduan langkah demi langkah untuk membangun (build) aplikasi **Ksatria Graphx Android APK** secara aman dari basis kode Capacitor.

---

## 1. Persyaratan Lingkungan Pengembangan

1. **Node.js**: Versi `>= 20.x` (Direkomendasikan Node.js v22 LTS).
2. **Package Manager**: `pnpm` (versi `>= 9.x` atau `12.x`).
3. **Android Studio**: Android Studio Ladybug / Koala atau versi terbaru dengan:
   - Android SDK Build-Tools (API 34 / 35)
   - Android SDK Platform (API 34 / 35)
   - JDK 17 atau JDK 21 (diatur pada `JAVA_HOME`)
4. **Koneksi Backend**: Pastikan nilai `NEXT_PUBLIC_API_BASE_URL` pada `.env.production` mengarah ke URL HTTPS publik backend Anda (contoh: `https://app.ksatriagraphx.com`).

---

## 2. Alur Dual-Build Web & Mobile

Aplikasi ini menggunakan arsitektur **Single Codebase**:
- **Web App (Vercel)**: Menjalankan Next.js Fullstack (Server Components + Route Handlers di `src/app/api`).
- **Android APK (Capacitor)**: Menjalankan Static HTML Export dari folder `out/`.

### Langkah 1: Ekspor Aset Statis Web
Jalankan perintah berikut di root repositori:
```bash
pnpm run build:mobile
```
Script `scripts/build-mobile.mjs` akan:
1. Memeriksa `NEXT_PUBLIC_API_BASE_URL`.
2. Mengamankan sementara folder `src/app/api` agar tidak memicu error dynamic server routes saat proses static export.
3. Menjalankan `next build` dengan `output: "export"`.
4. Mengembalikan folder `src/app/api` secara otomatis setelah build selesai.

### Langkah 2: Sinkronisasi Aset ke Proyek Android
Setelah folder `out/` terbentuk, sinkronkan ke proyek Android native:
```bash
pnpm run cap:sync
```

---

## 3. Build APK Debug (Untuk Pengujian di HP / Emulator)

### Opsi A: Menggunakan Android Studio (Direkomendasikan)
1. Buka folder `android/` di Android Studio:
   ```bash
   pnpm run cap:open:android
   ```
2. Tunggu sinkronisasi Gradle selesai.
3. Hubungkan perangkat HP Android via kabel USB (aktifkan *USB Debugging* di Pengaturan Developer HP).
4. Klik tombol **Run 'app'** (ikon panah hijau) untuk langsung menginstal ke HP.

### Opsi B: Menggunakan Gradle CLI
Jalankan perintah terminal berikut:
```bash
cd android
./gradlew assembleDebug
# Di Windows Command Prompt / PowerShell:
# .\gradlew.bat assembleDebug
```
File APK debug akan dihasilkan di:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 4. Build APK Release Signed (Siap Distribusi / Produksi)

### Langkah 1: Buat Keystore Produksi Secara Aman
> [!CAUTION]
> Simpan file keystore di luar direktori repositori Git (misalnya di folder dokumen pengguna Anda). DILARANG KERAS menyimpan file `.keystore` atau kata sandi keystore di dalam repositori publik!

Jalankan perintah berikut menggunakan terminal untuk membuat release keystore:
```bash
keytool -genkey -v -keystore ../ksatria-graphx-release.keystore -alias ksatriagraphx -keyalg RSA -keysize 2048 -validity 10000
```
Isi kata sandi dan informasi sertifikat dengan cermat.

### Langkah 2: Build Release APK di Android Studio
1. Buka Android Studio (`pnpm run cap:open:android`).
2. Pilih menu **Build** > **Generate Signed Bundle / APK...**.
3. Pilih opsi **APK** > klik **Next**.
4. Masukkan lokasi file keystore yang dibuat sebelumnya, isi kata sandi, dan pilih alias `ksatriagraphx`.
5. Pilih Build Variant: **release**.
6. Klik **Create** / **Finish**.
7. File APK release yang telah dioptimasi dengan R8/ProGuard dan ditandatangani digital siap didistribusikan ke perangkat kasir toko.

---

## 5. Fitur Native & Standar Keamanan Android yang Diterapkan

1. **Android Keystore Encrypted Storage**: Access Token dan Refresh Token disimpan terenkripsi menggunakan modul Keystore hardware native melalui `@aparajita/capacitor-secure-storage`.
2. **Anti-Backup**: Deklarasi `android:allowBackup="false"` mencegah pencurian sesi atau ekstraksi database aplikasi via ADB backup.
3. **Strict HTTPS & Anti-Cleartext**: Atribut `android:usesCleartextTraffic="false"` menjamin seluruh pertukaran data API terlindungi enkripsi TLS/HTTPS dan kebal terhadap packet sniffing di jaringan Wi-Fi toko.
4. **Perizinan Bluetooth Thermal**: Deklarasi izin `BLUETOOTH_SCAN` (`usesPermissionFlags="neverForLocation"`) dan `BLUETOOTH_CONNECT` untuk Android 12+ (API 31+) serta fallback backward compatibility untuk Android 10 dan 11.
5. **R8/ProGuard Obfuscation**: Minifikasi dan *dead-code elimination* aktif pada build release untuk menyulitkan reverse-engineering bytecode.
