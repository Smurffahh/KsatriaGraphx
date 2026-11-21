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

### Panduan Instalasi APK
1. Unduh berkas **KsatriaGraphx-*.apk** yang terlampir pada rilis ini.
2. Jika sebelumnya telah terpasang versi Debug di perangkat Anda, hapus (*uninstall*) terlebih dahulu untuk menghindari konflik tanda tangan aplikasi (*signature conflict*).
3. Buka file APK yang diunduh dan izinkan pemasangan dari sumber ini (*Install Unknown Apps*).
4. Masuk (*login*) menggunakan kredensial kasir atau pemilik usaha yang telah terdaftar.