# Panduan Build & Distribusi Android APK — Ksatria Graphx
**Otomatisasi Cloud Build via GitHub Actions (PRD v1.2.0)**

Dokumen ini memuat panduan lengkap untuk membangun (*build*) aplikasi **Ksatria Graphx Android APK** secara otomatis di **GitHub Actions** tanpa perlu menginstal Android Studio secara lokal, serta panduan opsional untuk build lokal jika diperlukan.

---

## 1. Ringkasan Alur Distribusi Cloud

Dengan GitHub Actions CI, Anda dapat menghasilkan file `.apk` siap pasang di HP dalam hitungan menit:
1. **Debug APK (Untuk Uji Coba Cepat):** Dibangun cukup dengan mengklik tombol **Run workflow** di tab Actions GitHub. Hasilnya langsung dapat diunduh dari bagian **Artifacts**.
2. **Signed Release APK (Untuk Penggunaan Operasional Kasir):** Ditandatangani menggunakan Keystore resmi yang disimpan aman di **GitHub Secrets**. Otomatis dipublikasikan ke halaman **GitHub Releases** setiap kali Anda membuat Git Tag (contoh: `v1.0.0`).

---

## 2. Cara 1-Klik Build & Unduh Debug APK di GitHub

Gunakan langkah ini untuk mencoba aplikasi di HP tanpa konfigurasi sertifikat/keystore:

1. Buka repositori **`https://github.com/Smurffahh/KsatriaGraphx`** di browser.
2. Klik tab **Actions** di menu atas.
3. Pada panel sebelah kiri, pilih workflow **"Build Android APK (Cloud CI)"**.
4. Klik tombol **"Run workflow"** di sisi kanan atas:
   - **Jenis Build APK:** Pilih `debug`.
   - **Target URL Backend API:** Pastikan terisi `https://ksatriagraphx.vercel.app`.
   - Klik tombol hijau **Run workflow**.
5. Tunggu pipeline selesai (~3 hingga 5 menit). Saat lingkaran berubah hijau (centang), klik nama workflow yang selesai tersebut.
6. Scroll ke bagian bawah pada seksi **Artifacts**, lalu unduh file **`KsatriaGraphx-debug-apk`**.
7. Ekstrak file zip yang diunduh untuk mendapatkan file **`KsatriaGraphx-debug.apk`**, kirim ke HP Android Anda, dan instal langsung!

---

## 3. Menyiapkan Keystore & GitHub Secrets untuk Signed Release APK

Untuk penggunaan operasional jangka panjang di toko, aplikasi harus ditandatangani dengan Keystore resmi agar update aplikasi di HP kasir tidak perlu uninstall terlebih dahulu.

### Langkah 1: Buat File Keystore (Cukup 1 Kali Saja)
Jalankan perintah berikut di terminal (Linux/macOS/Git Bash atau PowerShell Windows yang memiliki Java):

```bash
keytool -genkeypair -v -keystore release.keystore -alias ksatriagraphx -keyalg RSA -keysize 2048 -validity 10000
```
> *Catatan:* Anda akan diminta memasukkan password keystore dan data toko sederhana (nama, organisasi, kota). **Ingat/catat password dan alias tersebut!**

### Langkah 2: Konversi File Keystore ke Format Base64
Jalankan perintah berikut untuk mengubah file `release.keystore` menjadi teks Base64:

- **Di Windows PowerShell:**
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
  ```
  *(Teks Base64 otomatis tersalin ke clipboard Anda).*

- **Di Linux / macOS / Git Bash:**
  ```bash
  base64 -w 0 release.keystore | pbcopy # macOS
  # atau
  base64 -w 0 release.keystore # Linux (salin output yang tercetak)
  ```

> [!WARNING]
> Simpan file `release.keystore` asli Anda di tempat aman di luar folder proyek (misalnya di Google Drive pribadi). **DILARANG** meng-commit file `.keystore` ke dalam repositori Git!

### Langkah 3: Daftarkan 4 Secret di GitHub Repository
1. Di GitHub repositori Anda, buka menu **Settings** -> **Secrets and variables** -> **Actions**.
2. Klik tombol **New repository secret** untuk menambahkan 4 variabel berikut:

| Nama Secret | Nilai yang Dimasukkan |
| :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | Tempelkan teks Base64 dari file `release.keystore` (hasil Langkah 2). |
| `ANDROID_KEYSTORE_PASSWORD` | Password yang Anda masukkan saat membuat keystore. |
| `ANDROID_KEY_ALIAS` | `ksatriagraphx` (atau alias yang Anda gunakan di Langkah 1). |
| `ANDROID_KEY_PASSWORD` | Password untuk key alias tersebut. |

---

## 4. Cara Merilis Signed Release APK Otomatis ke GitHub Releases

Setelah keempat GitHub Secrets terpasang:

1. Buat Git Tag versi baru di laptop Anda:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions akan otomatis mendeteksi tag `v1.0.0`, mengeksekusi *pipeline* build release dengan optimasi R8/ProGuard aktif, menandatangani APK, dan memublikasikan **`KsatriaGraphx-v1.0.0-release.apk`** langsung di tab **Releases** repositori Anda.
3. Kasir atau teknisi toko cukup membuka link GitHub Releases dari browser HP dan mengunduh APK tersebut.

---

## 5. Fitur Cetak Thermal Bluetooth di APK (`US-012`)

Pada versi APK Android ini, aplikasi telah terintegrasi dengan **Native Bluetooth Classic SPP Thermal Printer Plugin (`ThermalPrinterPlugin.java`)**:
- Mendukung printer thermal portabel Bluetooth ukuran kertas **58mm (32 kolom)** dan **80mm (48 kolom)**.
- Standar UUID SPP: `00001101-0000-1000-8000-00805F9B34FB`.
- Mekanisme **Chunked Write (128 bytes)** untuk stabilitas transmisi pada printer thermal Bluetooth ekonomis.
- Pairing dan pemilihan printer default dapat dilakukan oleh Kasir maupun Owner langsung dari menu **Pengaturan** di aplikasi Android.

---

## 6. (Opsional) Build APK Lokal Menggunakan Gradle / Android Studio

Jika di kemudian hari Anda menginstal Android Studio / Android SDK lokal di laptop:

1. Ekspor aset statis dan sinkronkan Capacitor:
   ```bash
   pnpm run build:mobile
   pnpm run cap:sync
   ```
2. Buka proyek Android di Android Studio:
   ```bash
   pnpm run cap:open:android
   ```
   atau jalankan build debug via Gradle CLI:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   File APK lokal akan berada di: `android/app/build/outputs/apk/debug/app-debug.apk`.
