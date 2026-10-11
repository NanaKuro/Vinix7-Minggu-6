# PROMPT.md — Panduan Pembuatan Sistem VisionStock

> Dokumen ini adalah panduan utama untuk AI coding assistant (Claude Code / Cursor / dsb.) dalam membangun sistem **VisionStock**: aplikasi web manajemen inventaris dan rekomendasi stok untuk UMKM.
> Baca seluruh dokumen sebelum menulis kode. Jika ada hal yang ambigu atau bertanda `[PUTUSKAN]`, **tanyakan dulu, jangan berasumsi**.

---

## 1. Ringkasan Proyek

| Item | Isi |
|---|---|
| Nama aplikasi | VisionStock |
| Jenis | Aplikasi web (responsive, desktop-first) |
| Target pengguna | Pemilik UMKM kecil–menengah (warung, toko kue, usaha susu murni, dsb.) |
| Masalah utama | UMKM kesulitan menentukan **kapan dan berapa banyak** barang harus di-restock, sehingga stok sering kosong atau berlebih |
| Solusi inti | Pencatatan stok + riwayat transaksi → analisis stok → **rekomendasi isi stok** → **notifikasi WhatsApp** |
| Prinsip desain | Sederhana, tanpa fitur kompleks, mudah dipakai pemilik UMKM yang tidak terbiasa dengan software |

### Tujuan sistem
1. Memudahkan pencatatan stok (manual atau impor Excel).
2. Mencatat riwayat transaksi penjualan sebagai dasar analisis.
3. Menghasilkan rekomendasi restock yang mudah dibaca.
4. Mengirim rekomendasi ke WhatsApp pemilik.

### Di luar cakupan (jangan dibuat kecuali diminta)
Multi-cabang, kasir/POS penuh, pembayaran online, laporan keuangan, multi-role pengguna.

---

## 2. Sumber Acuan (Source of Truth)

| File | Fungsi | Prioritas |
|---|---|---|
| `docs/user-flow.png` | User flow lengkap (alur logika & percabangan) | **Acuan alur & logika** |
| `docs/ui/*.svg` | Desain tampilan tiap layar & state | **Acuan tampilan** |
| `prompt.md` (file ini) | Aturan, struktur, dan urutan pengerjaan | **Acuan proses kerja** |

**Aturan konflik:** alur → ikuti user flow; tampilan → ikuti UI SVG. Jika keduanya bertentangan atau ada yang kurang, catat di §14 (Pertanyaan Terbuka) dan tanyakan.

---

## 3. Tech Stack

| Lapisan | Pilihan |
|---|---|
| Framework & backend | Laravel (PHP) |
| Frontend | Laravel Blade |
| Styling | Tailwind CSS |
| Database | MySQL |
| Autentikasi | Session (bawaan Laravel) |
| Impor Excel | Laravel Excel (`maatwebsite/excel`) |
| Notifikasi WhatsApp | WhatsApp Business API |
| Penyimpanan gambar & invoice | Cloud storage — penyedia: `[PUTUSKAN]` (mis. S3 / Cloudinary) lewat Laravel Filesystem |
| Deployment | `[PUTUSKAN]` |

Catatan:
- WhatsApp Business API resmi membutuhkan verifikasi bisnis dan persetujuan template pesan. Bungkus pengiriman dalam satu service/interface (`WhatsAppService`) agar penyedia mudah diganti (mis. ke gateway lain) bila verifikasi menghambat.
- Gunakan fitur bawaan Laravel (Form Request, Eloquent, Policy, Storage, Queue) sebelum menambah paket pihak ketiga.

---

## 4. Struktur Navigasi & Halaman

```
Landing Page
└── Login / Registrasi
    └── Dashboard
        ├── Data Stok
        │   ├── Daftar produk (kartu) + filter + pencarian
        │   ├── Edit Stok (modal)
        │   └── Impor Stok (Excel / Manual)
        ├── Analisis Stok
        │   ├── Tabel "Stok Saat Ini" + rekomendasi isi stok
        │   └── Kirim Notifikasi ke WhatsApp (dengan konfirmasi)
        ├── Riwayat Transaksi
        │   ├── Tabel transaksi + filter + pencarian
        │   └── Impor Transaksi (Excel / Manual)
        └── Pengaturan
            ├── Edit Profil
            └── Hubungkan ke WhatsApp
```

Layout setelah login: **top bar** (ikon menu + home + judul "VisionStock" + pencarian/aksi kontekstual) dan **sidebar kiri** (Data Stok, Analisis Stok, Riwayat Transaksi, Pengaturan, profil "Admin" di bawah).

---

## 5. Spesifikasi Halaman (dipetakan dari UI)

Untuk setiap halaman, cocokkan dengan file SVG yang disebutkan.

### 5.1 Landing Page
- UI: `Landing Page - Novi.svg`
- Pengenalan singkat aplikasi dengan tema **"Solusi Permasalahan Stok"**, plus tombol menuju Login/Registrasi.

### 5.2 Login / Registrasi
- UI: `Masuk Login.svg`, `Masuk Login-1.svg`, `Error login.svg`, `Login/registrasi - Novi.svg`, `Form registrasi.svg`, `Error registrasi.svg`
- Login: Username/Email, Password; tombol **Masuk**, **Daftar**.
- Registrasi: Username/Email, Password, Ulangi Password.
- Password minimal 8 karakter (petunjuk tampil di bawah kolom password).
- State error mengikuti UI error. Login gagal → kembali ke form login (loop "Gagal" pada user flow). Berhasil → Dashboard.

### 5.3 Dashboard
- UI: `Dashboard.svg`
- Sapaan "Halo, Admin! Ingin melakukan apa hari ini?"
- Kartu ringkasan: **Total Riwayat Transaksi**, **Total Produk** (jumlah jenis produk), **Jumlah Produk** (total unit stok), **Jumlah Transaksi**.
- Semua angka dihitung dari database, bukan hardcode.

### 5.4 Data Stok
- UI: `Data Stok.svg`, `Data Stok 2 - Novi.svg`, `Data Stok berhasil.svg`, `Edit stok.svg`, `Edit stok terisi.svg`
- Kartu produk (gambar + nama) dengan tombol **Edit Stok**.
- Filter: abjad (A–Z / Z–A), stok (terbanyak / tersedikit), jenis produk (dropdown). Pencarian + tombol **Impor Stok**.
- **Edit Stok** (modal): gambar, nama produk, deskripsi, stok, jenis produk; tombol Simpan / Batal.
- User flow: jika **data belum ada** → pilihan input (Impor Excel atau Input Manual) → data tersimpan → tampilkan data stok.

### 5.5 Impor Data Stok
- UI: `Impor Data.svg`, `Impor Data manual.svg`, `Impor Data otomatis.svg`, `Impor Data otomatis-1.svg`, `Notif impor berhasil.svg`
- **Unggah Excel:** drag & drop / pilih file, format `.xlsx`, **maks. 10 MB**, indikator progres ("File sedang diunggah… 90%"), notifikasi berhasil.
- **Impor Manual:** Nama Produk, Deskripsi Produk, Gambar Produk (unggah), Stok Produk, Jenis Produk; tombol Simpan / Reset.
- Sediakan **template Excel** yang dapat diunduh dan validasi per baris (kolom wajib, tipe angka, duplikat). Baris yang gagal dilaporkan dengan nomor baris dan alasannya.

### 5.6 Analisis Stok
- UI: `Analisis Stok.svg`, `Konfirmasi notif.svg`, `Konfirmasi notif-1.svg`
- Tabel "Stok Saat Ini": No, Nama Produk, Sisa Stok, **Rekomendasi Isi Stok**, Tanggal.
- Tombol **Edit Stok** dan **Kirim Notifikasi ke WhatsApp**.
- Kirim notifikasi → dialog konfirmasi "Ingin mengirim analisis ini ke WhatsApp?" (Kirim / Batal).
- User flow: jika **stok belum ada** → arahkan ke input stok.
- Jika WhatsApp **belum terhubung** → arahkan ke Pengaturan > Hubungkan WhatsApp; jika **sudah** → kirim notifikasi → selesai.

### 5.7 Riwayat Transaksi
- UI: `Riwayat Transaksi.svg`, `Impor transaksi.svg` s.d. `Impor transaksi-5.svg`
- Filter: abjad, stok (terbanyak/tersedikit), tanggal. Pencarian + tombol **Impor Transaksi**.
- Tabel: No, Nama Produk, Stok Terjual, Tanggal, **Invoice** (ikon; dapat dilihat/diunduh).
- Input: Unggah Excel (`.xlsx`, maks. 10 MB) atau manual (Nama Produk, Stok Terjual, Tanggal Terjual, Bukti Invoice).
- User flow: jika **riwayat belum ada** → pilihan input; jika **ada** → tampilkan riwayat.
- Transaksi yang tersimpan **mengurangi sisa stok** produk terkait (lihat §8 untuk aturan batas).

### 5.8 Pengaturan
- UI: `Pengaturan.svg`, `Pengaturan-1.svg`, `Pengaturan-2.svg`
- **Edit Profil:** Nama, Email, Atur Ulang Password, Konfirmasi Password; Simpan / Kembali.
- **Hubungkan ke WhatsApp:** input Nomor Telepon, tombol Kirim / Kembali.
- Alur: hubungkan → berhasil terhubung? → Gagal: ulangi; Berhasil: tampil notifikasi berhasil → kembali ke Pilih Menu.

---

## 6. Logika Rekomendasi Stok (inti sistem)

**Keputusan:** rumus berbasis rata-rata penjualan, dengan data historis dan target cakupan sama-sama **30 hari**.

```
rata_rata_harian    = total_terjual_30_hari_terakhir / 30
kebutuhan_30_hari   = rata_rata_harian × 30
rekomendasi_isi     = max(0, ceil(kebutuhan_30_hari − sisa_stok))
```

- Input: sisa stok produk dan riwayat transaksi 30 hari terakhir. Output: angka rekomendasi per produk (kolom "Rekomendasi Isi Stok").
- Hasil selalu bilangan bulat ≥ 0 (dibulatkan ke atas).
- Kasus khusus (default awal, boleh diubah): 
  - Produk tanpa riwayat transaksi 30 hari → rekomendasi 0 dan ditandai "data belum cukup".
  - Stok 0 dengan riwayat penjualan → tetap dihitung dengan rumus di atas.
- Tulis sebagai **fungsi/service murni yang terpisah (`RekomendasiStokService`) dan wajib punya unit test**, termasuk contoh angka, stok melebihi kebutuhan (hasil 0), dan produk tanpa riwayat.
- Jadikan `30` konstanta/konfigurasi (`config/visionstock.php`), jangan hardcode di banyak tempat.

---

## 7. Model Data (usulan awal)

```
User(id, nama, email/username, password_hash, no_whatsapp, wa_terhubung, created_at)
Produk(id, user_id, nama, deskripsi, gambar_url, stok, jenis_produk_id, created_at, updated_at)
JenisProduk(id, user_id, nama)
Transaksi(id, user_id, produk_id, jumlah_terjual, tanggal_terjual, invoice_url, created_at)
Rekomendasi(id, user_id, produk_id, sisa_stok, jumlah_rekomendasi, tanggal)
NotifikasiWA(id, user_id, isi, status, dikirim_pada)
ImporLog(id, user_id, jenis[stok|transaksi], nama_file, status, jumlah_baris, created_at)
```

- Semua data **terikat ke `user_id`**; pemilik UMKM hanya melihat datanya sendiri (gunakan Policy / global scope).
- Gunakan migration dan Eloquent relationship. Catat setiap revisi model di §13.

---

## 8. Aturan Bisnis & Validasi

- Stok tidak boleh negatif. Jika jumlah terjual melebihi stok tersedia, tampilkan **peringatan** dan **jangan simpan** transaksi sampai jumlah diperbaiki.
- Nama produk unik per pengguna (cegah duplikat, termasuk saat impor).
- Berkas impor: hanya `.xlsx`, maks. **10 MB**.
- Gambar produk & invoice: maks. **5 MB**; tipe yang diterima `pdf, jpg, png` (usul: jpg, png; invoice juga pdf).
- Nomor WhatsApp: format internasional (mis. +62…) dan divalidasi.
- Password di-hash (bcrypt/argon2), minimal 8 karakter, tidak pernah disimpan plaintext.
- Pesan error dan sukses berbahasa Indonesia, jelas, dan sesuai state di UI.

---

## 9. Panduan Desain (dari UI)

| Elemen | Nilai |
|---|---|
| Warna utama (sidebar, top bar, kartu) | `#51B0A5` |
| Warna latar konten / tombol | `#A3DED3` |
| Warna teks & aksen | `#5F242F` |
| Tipografi | Poppins (sesuai desain; verifikasi di file desain sebelum dipakai) |
| Gaya | Sudut membulat, kartu datar, ikon outline, layout sidebar |
| Bahasa antarmuka | Bahasa Indonesia |

- Ambil ukuran, jarak, dan radius langsung dari SVG; jangan menebak.
- Definisikan **design tokens** (warna, font, radius, spacing) satu kali di `tailwind.config.js`.
- Buat seluruh state di UI: normal, error, loading, sukses, kosong (*empty state*), dan modal konfirmasi.

---

## 10. Struktur Folder (Laravel)

```
visionstock/
├── prompt.md
├── README.md
├── docs/
│   ├── user-flow.png
│   └── ui/                         # SVG desain
├── app/
│   ├── Http/
│   │   ├── Controllers/            # AuthController, DashboardController, StokController,
│   │   │                           # AnalisisController, TransaksiController, PengaturanController
│   │   └── Requests/               # Form Request (validasi)
│   ├── Imports/                    # Laravel Excel: StokImport, TransaksiImport
│   ├── Models/                     # User, Produk, JenisProduk, Transaksi, ...
│   ├── Policies/
│   └── Services/                   # RekomendasiStokService, WhatsAppService
├── config/visionstock.php          # konstanta (mis. hari_cakupan = 30)
├── database/migrations/
├── resources/
│   ├── views/                      # landing, auth, dashboard, stok, analisis, transaksi, pengaturan
│   │   └── components/             # sidebar, topbar, kartu-produk, tabel, modal, upload-box, filter
│   └── css/ js/
├── routes/web.php
├── tests/
│   ├── Unit/                       # RekomendasiStokServiceTest
│   └── Feature/                    # auth, impor, transaksi, notifikasi WA
└── .env.example
```

---

## 11. Urutan Pengerjaan (Roadmap)

Kerjakan **per tahap**; selesaikan dan uji satu tahap sebelum lanjut.

1. **Setup** — inisialisasi Laravel, Tailwind, design tokens, layout dasar (sidebar + topbar), routing.
2. **Autentikasi** — Landing, Login, Registrasi, state error, proteksi halaman.
3. **Dashboard** — kartu ringkasan dari data nyata.
4. **Data Stok** — CRUD produk, filter, pencarian, modal Edit Stok.
5. **Impor Stok** — Laravel Excel (+ template, validasi, progres) dan input manual.
6. **Riwayat Transaksi** — daftar, filter, impor Excel/manual, unggah invoice, pengurangan stok.
7. **Analisis Stok** — tabel + `RekomendasiStokService` (§6) + unit test.
8. **WhatsApp** — Pengaturan > Hubungkan, kirim notifikasi dengan dialog konfirmasi, penanganan gagal.
9. **Pengaturan Profil** — edit profil & ganti password.
10. **QA & Polishing** — uji alur end-to-end, responsif, empty/error state, aksesibilitas dasar.

---

## 12. Aturan Kerja untuk AI

1. **Rencanakan dulu** — sebelum kode tiap tahap, tulis rencana singkat (file yang dibuat/diubah) lalu minta konfirmasi.
2. **Satu tahap per giliran** — jangan mengerjakan beberapa tahap sekaligus.
3. **Ikuti UI & user flow secara persis**; jangan menambah fitur atau mengubah teks label tanpa izin.
4. **Jangan mengarang** rumus, kredensial, API key, atau data; gunakan `.env` dan data contoh yang jelas ditandai.
5. **Kode bersih** — komponen Blade kecil dan dapat dipakai ulang, nama jelas, tanpa duplikasi, validasi di sisi klien **dan** server (Form Request).
6. **Keamanan** — hashing password, sanitasi input, validasi tipe/ukuran berkas, otorisasi per `user_id`, proteksi CSRF.
7. **Uji** — unit test untuk logika rekomendasi dan validasi impor; jelaskan cara menjalankannya (`php artisan test`).
8. **Komunikasi** — di akhir tiap tahap: ringkas apa yang selesai, cara menjalankan/menguji, dan hal yang belum beres.
9. Bila ada kebutuhan yang tidak tertulis di sini, **tanya**, jangan menebak.

---

## 13. Catatan Perubahan (Changelog Keputusan)

| Keputusan | Alasan / Catatan |
|---|---|
| Stack: Laravel Blade, Tailwind CSS, MySQL, session auth | Ditentukan tim |
| Impor Excel memakai Laravel Excel (bukan pandas) | Konsisten dengan stack PHP/Laravel, tanpa service Python terpisah |
| Rekomendasi stok: rata-rata penjualan, data historis 30 hari, cakupan 30 hari | Rumus sederhana dan mudah dijelaskan ke pemilik UMKM |
| Notifikasi lewat WhatsApp Business API | Ditentukan tim; dibungkus `WhatsAppService` agar bisa diganti |
| Berkas impor `.xlsx` maks. 10 MB; gambar & invoice maks. 5 MB; password min. 8 karakter | Ditentukan tim |
| Jumlah terjual > stok → beri peringatan, transaksi tidak disimpan | Menghindari stok negatif |
| Transaksi mengurangi sisa stok | Asumsi awal, `[PUTUSKAN]` jika perlu diubah |

---

## 14. Pertanyaan Terbuka

- [ ] Penyedia cloud storage dan target deployment?
- [ ] Tipe berkas gambar/invoice yang diterima?
- [ ] Apakah transaksi otomatis mengurangi stok (asumsi saat ini: ya)?
- [ ] Apakah notifikasi WhatsApp juga otomatis saat stok di bawah batas (bukan hanya lewat tombol manual)?
- [ ] Perilaku produk tanpa riwayat transaksi (default saat ini: rekomendasi 0 + penanda)?
- [ ] Konten teks lengkap Landing Page?

---

## 15. Definition of Done

Sistem dianggap selesai bila:
- [ ] Seluruh alur pada user flow dapat dijalankan dari awal sampai **Selesai** (termasuk semua percabangan Ya/Tidak dan loop Gagal).
- [ ] Setiap layar & state pada UI SVG telah diimplementasikan.
- [ ] Impor Excel & input manual bekerja untuk stok dan transaksi.
- [ ] Rekomendasi stok tampil benar dan lolos unit test.
- [ ] Notifikasi WhatsApp terkirim setelah konfirmasi, dan alur "belum terhubung" ditangani.
- [ ] Data antar pengguna terisolasi, tidak ada kredensial di repositori.
- [ ] README berisi cara instalasi, konfigurasi `.env`, dan menjalankan aplikasi.
