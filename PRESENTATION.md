# SiKantin — Materi Presentasi

## Ringkasan Eksekutif

SiKantin adalah aplikasi pemesanan makanan untuk lingkungan kampus Universitas Yatsi Madani. Aplikasi menyediakan katalog tenant dan menu yang dapat dibuka tanpa login, checkout menggunakan NIM mahasiswa, serta pelacakan pesanan menggunakan token.

Sistem ini ditujukan untuk membuat proses memilih dan memesan makanan lebih teratur: mahasiswa dapat melihat pilihan kantin dan mengirim pesanan sebelum mengambilnya, sementara admin dapat mengelola tenant dan menu dari satu dashboard. Status tenant Buka/Tutup ditampilkan agar mahasiswa mengetahui apakah pesanan dapat dibuat.

## Arsitektur Sistem

### Teknologi yang digunakan

- **Astro** — menyusun halaman dan route aplikasi. Aplikasi menggunakan Node adapter karena halaman tenant dinamis memuat data berdasarkan slug.
- **Tailwind CSS** — membangun tampilan responsif untuk katalog, halaman menu, dashboard, dan form.
- **Supabase** — menyediakan PostgreSQL, autentikasi, Row Level Security (RLS), Storage, Realtime, dan Edge Functions.
- **Supabase Edge Functions** — menangani validasi NIM, pembuatan pesanan guest, serta pencarian pesanan berdasarkan token.
- **Baileys** — menghubungkan gateway Node.js ke WhatsApp untuk mengirim notifikasi pesanan dan memproses metadata pesan masuk.
- **ngrok** — menyediakan URL HTTPS tunnel menuju gateway WhatsApp lokal agar Edge Function dapat menghubunginya. ngrok adalah jalur koneksi, bukan tempat aplikasi atau database disimpan.

### Gambaran komponen

```text
Browser mahasiswa/admin
          |
          v
Astro (halaman dan route)
          |
          +------ Supabase Auth / PostgreSQL / Storage / Realtime
          |
          +------ Supabase Edge Function: validate-nim
          |
          +------ Supabase Edge Function: create-guest-order
                                      |
                                      +--> Simpan order dan detail ke PostgreSQL
                                      +--> Simpan bukti QRIS ke Storage
                                      +--> HTTPS melalui ngrok
                                                |
                                                v
                                      Node.js WhatsApp Gateway
                                                |
                                                v
                                      Baileys --> WhatsApp mahasiswa
```

Supabase tetap menjadi sumber data untuk tenant, menu, pesanan, akun, dan bukti transfer. Gateway WhatsApp merupakan proses Node.js terpisah; jika gateway tidak tersedia, Edge Function tetap menyimpan pesanan dan melaporkan status notifikasi secara terpisah.

## Fitur Utama

### Admin

- Login admin dengan Supabase Auth dan pemeriksaan role `admin`.
- Dashboard untuk mengelola akun pengguna, tenant, dan menu.
- Form tenant mencakup informasi kantin, status operasional, dan URL QRIS.
- Form menu mencakup tenant, nama, kategori, harga, waktu persiapan, foto, dan konfigurasi add-on/topping.
- Akses data admin dibatasi melalui role dan kebijakan RLS Supabase.

### Mahasiswa / Guest

- Melihat katalog tenant tanpa membuat sesi login.
- Memilih tenant lewat URL berbasis slug, lalu melihat menu tenant tersebut.
- Mencari dan memfilter menu berdasarkan kategori.
- Memilih satu atau beberapa add-on pada menu yang menyediakannya.
- Checkout dengan NIM dan nomor WhatsApp; NIM divalidasi sebagai mahasiswa.
- Membayar dengan memindai QRIS tenant dan mengunggah bukti transfer JPG/PNG.
- Menerima token pesanan untuk memeriksa status.
- Melihat perubahan status pesanan melalui halaman pelacakan dan Realtime.

### Add-on, harga, dan pesanan

- Pilihan add-on disimpan sebagai konfigurasi JSONB pada menu.
- ID add-on yang dipilih dikirim dari browser; Edge Function memvalidasi pilihan terhadap konfigurasi menu di database dan menghitung harganya di sisi server.
- Snapshot add-on beserta harga disimpan pada detail `order_items`, dan total order memasukkan harga add-on.

### Notifikasi WhatsApp

- Setelah pesanan dibuat, Edge Function mencoba mengirim nomor pesanan, total, dan token melalui gateway WhatsApp.
- Gateway memeriksa API key dan format nomor sebelum meminta Baileys mengirim pesan.
- Status notifikasi dibedakan dari hasil penyimpanan pesanan: pesanan dapat tersimpan walaupun notifikasi gagal atau gateway belum dikonfigurasi.

## Flow Sistem / User Journey

### Flow Admin

1. Admin membuka halaman login admin dan masuk menggunakan akun Supabase.
2. Aplikasi memeriksa role akun; hanya role admin yang diarahkan ke dashboard admin.
3. Admin menambahkan tenant, menetapkan pemilik dan informasi operasional, lalu mengatur QRIS.
4. Admin menambahkan menu untuk tenant, termasuk kategori, harga, foto, dan waktu persiapan.
5. Jika diperlukan, admin menambahkan add-on beserta harga tambahannya.
6. Admin menyimpan perubahan; katalog guest membaca tenant dan menu yang tersedia.

### Flow Guest / Mahasiswa

1. Mahasiswa membuka katalog SiKantin tanpa login.
2. Mahasiswa memilih tenant yang buka dan melihat katalog menu.
3. Mahasiswa mencari atau memfilter menu, lalu memilih menu.
4. Jika menu memiliki add-on, mahasiswa memilih topping/varian pada modal. Harga keranjang diperbarui.
5. Mahasiswa memasukkan NIM dan nomor WhatsApp. NIM diperiksa melalui Edge Function.
6. Mahasiswa memindai QRIS tenant dan mengunggah bukti transfer.
7. Edge Function memvalidasi ulang NIM, tenant, menu, add-on, jumlah, dan harga berdasarkan data server; lalu menyimpan pesanan beserta detail dan bukti transfer.
8. Edge Function membuat token pesanan dan mencoba mengirim notifikasi WhatsApp melalui gateway Baileys.
9. Mahasiswa menyimpan token dan membuka halaman cek pesanan untuk melihat status. Pembaruan status dapat diterima melalui Realtime.

> **Catatan pembayaran:** implementasi checkout menggunakan QRIS dan unggahan bukti transfer. Kode yang ada tidak menunjukkan integrasi payment gateway yang otomatis mengonfirmasi pembayaran; verifikasi bukti merupakan proses terpisah.

## Poin Presentasi (Talking Points)

- SiKantin menargetkan masalah pemilihan dan pemesanan makanan kantin kampus agar mahasiswa dapat melihat menu dan membuat pesanan sebelum mengambil makanan.
- Mahasiswa dapat menggunakan katalog dan checkout sebagai guest; NIM tetap divalidasi agar pemesanan terhubung ke identitas mahasiswa yang terdaftar.
- Dashboard admin menyatukan pengelolaan tenant, menu, pengguna, QRIS, serta topping/varian.
- Sistem menggunakan Edge Function sebagai batas server untuk validasi pesanan dan perhitungan harga. Harga add-on tidak dipercaya dari browser.
- Supabase menyediakan database, autentikasi, RLS, penyimpanan bukti, dan pembaruan status; pemisahan ini mengurangi kebutuhan mengelola banyak layanan backend sendiri.
- Baileys menghubungkan notifikasi WhatsApp ke gateway Node.js. Kegagalan gateway tidak menghapus pesanan yang telah tersimpan.
- QRIS dan bukti transfer menjaga alur pembayaran tetap sederhana, sementara status pesanan dapat dipantau dengan token dan pembaruan Realtime.

## Antisipasi Pertanyaan Dosen (Q&A)

**1. Mengapa menggunakan Baileys, bukan WhatsApp Business Platform resmi?**  
Baileys dipakai untuk prototipe karena dapat menghubungkan akun WhatsApp melalui gateway Node.js dengan cepat. Untuk operasi produksi, WhatsApp Business Platform resmi layak dipertimbangkan karena dukungan bisnis dan tata kelola yang lebih formal. Pilihan saat ini membawa ketergantungan pada sesi perangkat tertaut dan gateway yang harus aktif.

**2. Bagaimana harga add-on dijaga agar tidak bisa dimanipulasi dari browser?**  
Browser hanya mengirim ID add-on yang dipilih. Edge Function mengambil konfigurasi dan harga dari database, memvalidasi ID pilihan, lalu menghitung subtotal dan total di server sebelum menyimpan pesanan.

**3. Bagaimana sistem ini bisa di-host?**  
Astro perlu dijalankan pada hosting yang mendukung Node.js karena memakai Node adapter dan route dinamis. Supabase menjadi layanan cloud untuk database dan Edge Functions. Gateway Baileys perlu proses Node.js yang selalu aktif; ngrok dapat dipakai untuk pengujian, sedangkan produksi sebaiknya menggunakan endpoint HTTPS stabil dan penyimpanan sesi yang persisten.

## Catatan Status Implementasi

Dokumen ini merangkum struktur kode proyek. Keberhasilan fitur secara end-to-end tetap bergantung pada penerapan migrasi database, deployment Edge Functions, konfigurasi secrets, dan ketersediaan gateway WhatsApp pada lingkungan yang digunakan.
