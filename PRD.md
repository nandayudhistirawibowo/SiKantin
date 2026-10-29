# Product Requirements Document — SiKantin

## 1. Ringkasan

SiKantin adalah aplikasi pemesanan dan pengelolaan kantin untuk lingkungan Universitas Yatsi Madani (UYM). Pengunjung dapat menemukan tenant, melihat menu, membuat pesanan tanpa akun, membayar melalui QRIS secara manual, lalu memantau status menggunakan token. Mahasiswa yang login mendapat profil dan pengisian data checkout yang lebih praktis. Tenant mengelola pesanan serta status operasional; admin mengelola data platform.

## 2. Latar Belakang

Pemesanan kantin secara langsung dapat menyebabkan antrean, menyulitkan mahasiswa melihat pilihan menu, dan membuat tenant sulit mengatur pesanan masuk. SiKantin menyediakan katalog kampus yang dapat diakses melalui web dan menghubungkan pelanggan dengan tenant melalui status pesanan serta notifikasi WhatsApp.

## 3. Tujuan dan Indikator Keberhasilan

- Mahasiswa dapat menemukan tenant/menu dan membuat pesanan guest tanpa registrasi.
- Setiap pesanan yang berhasil dibuat mempunyai nomor pesanan, nomor antrean harian, dan token pelacakan.
- Tenant dapat melihat pesanan dan memperbarui statusnya dari dashboard.
- Status buka/tutup otomatis mengikuti jadwal WIB; tenant tetap dapat mengubah status secara manual sampai batas jadwal berikutnya.
- Bukti pembayaran QRIS dapat diperiksa manusia sebelum pesanan diproses.
- Admin dapat mengelola tenant, pemilik, mahasiswa, dan menu.
- Notifikasi WhatsApp berfungsi sebagai kanal pemberitahuan, bukan sumber data pesanan.

## 4. Target Pengguna

| Pengguna | Kebutuhan utama |
|---|---|
| Mahasiswa / pengunjung | Menemukan kantin, memesan dengan langkah singkat, mengetahui antrean/status, dan memberi rating setelah pesanan selesai. |
| Pemilik tenant | Mengatur operasional, melihat pesanan baru, memeriksa bukti transfer, dan menyampaikan perkembangan pesanan. |
| Admin kampus | Menjaga data akun, tenant, menu, jadwal, dan informasi QRIS tetap tertata. |

## 5. Ruang Lingkup Fitur per Peran

### Mahasiswa tanpa login

- Menjelajah tenant dan menu yang tersedia.
- Memfilter tenant buka dan mencari/mengurutkan menu.
- Mengisi NIM dan nomor WhatsApp, memilih jumlah serta add-on, dan mengunggah bukti transfer.
- Menerima token/nomor antrean lalu melacak status pesanan.
- Memberi rating tenant setelah pesanan selesai.

### Mahasiswa login

- Login memakai NIM dan password akun.
- Mengelola nama, nomor WhatsApp, foto profil, dan password.
- Menandai tenant favorit.
- Checkout dengan data profil yang diisi otomatis bila tersedia.
- Melihat riwayat pesanan akun dan membuka pelacakan token.

### Pemilik tenant

- Melihat pesanan masuk, ringkasan penjualan/pesanan, menu, dan riwayat.
- Memeriksa bukti transfer QRIS secara manual sebelum mengubah pesanan ke status diproses.
- Memperbarui status pesanan; perubahan dapat disampaikan lewat WhatsApp dan realtime.
- Mengubah status kantin secara manual. Override berlaku sampai pergantian jadwal buka/tutup berikutnya.

### Admin

- Mengelola profil pengguna dan role, tenant, pemilik, menu, jam operasional, dan aset gambar terkait.
- Menetapkan jam buka dan tutup dalam waktu WIB. Jadwal lama dengan format jam yang dikenali dimigrasikan otomatis.
- Memantau ringkasan data yang tersedia pada dashboard.

> **Catatan proses:** verifikasi bukti QRIS saat ini dilakukan oleh pemilik tenant melalui dashboard tenant; dashboard admin yang ada belum menyediakan tindakan verifikasi pembayaran.

## 6. Aturan Operasional Tenant

- Jadwal berulang setiap hari menggunakan zona waktu `Asia/Jakarta` (WIB).
- `jam_buka < jam_tutup`: tenant buka pada rentang `[jam_buka, jam_tutup)`.
- `jam_buka > jam_tutup`: jadwal melintasi tengah malam; tenant buka sejak jam buka sampai tengah malam dan dari tengah malam sampai jam tutup.
- Jam buka dan tutup yang sama ditolak. Kedua nilai harus diisi bersama atau sama-sama kosong.
- Supabase `pg_cron` menjalankan sinkronisasi status setiap menit. Pemrosesan tidak bergantung pada tenant/browser yang sedang membuka halaman.
- Tombol manual memanggil RPC yang memvalidasi pemilik tenant dan menyimpan `override_until` pada batas jadwal berikutnya. Sampai waktu itu, scheduler tidak mengganti status manual.
- Pada batas tersebut, scheduler menghitung status dari jadwal dan menghapus `override_until`.
- Jika jadwal belum dikonfigurasi, sinkronisasi otomatis tidak mengubah status. Perubahan manual bertahan sampai jadwal dikonfigurasi.
- Perubahan jadwal admin membatalkan override yang sedang berjalan sehingga scheduler kembali memakai jadwal terbaru.

## 7. Alur Bisnis Pesanan

1. Pengunjung memilih tenant yang buka dan item/menu.
2. Checkout memvalidasi input, identitas NIM, status tenant, ketersediaan item, dan harga berdasarkan database.
3. Untuk pembayaran QRIS, pengguna mengunggah bukti transfer. Tidak ada payment gateway yang mengonfirmasi pembayaran otomatis.
4. Sistem membuat pesanan dan detail item, memberikan nomor antrean per tenant/tanggal WIB serta token pelacakan.
5. Edge Function mencoba mengirim notifikasi melalui gateway WhatsApp yang berjalan terpisah. Kegagalan notifikasi tidak membatalkan pesanan yang sudah tersimpan.
6. Tenant memeriksa pembayaran dan memperbarui status. Perubahan status tersedia lewat dashboard/realtime dan notifikasi WhatsApp sesuai integrasi.
7. Mahasiswa melacak pesanan dengan token; setelah status selesai, rating tenant dapat dikirim.

### Status pesanan utama

`Menunggu Verifikasi` → `Diproses` → `Siap diambil` → `Selesai`

Pesanan dapat menjadi `Dibatalkan` bila ditolak/dibatalkan. Status yang tersedia pada dashboard bergantung pada alur transisi yang diizinkan aplikasi.

## 8. Batasan dan Di Luar Ruang Lingkup

- Pembayaran QRIS bersifat manual: unggah bukti dan verifikasi visual, bukan integrasi payment gateway.
- WhatsApp bergantung pada koneksi gateway dan sesi Baileys; pesan gagal tidak menghapus data pesanan.
- Nomor antrean kembali mulai dari awal pada tanggal lokal berikutnya.
- Jadwal buka/tutup berlaku harian, belum mendukung hari libur, jadwal per hari, atau pengecualian khusus.
- Status otomatis diperbarui hingga satu interval cron (sekitar satu menit) setelah batas jadwal.
- Pembuatan akun mahasiswa/pemilik dilakukan melalui admin, bukan pendaftaran mandiri.
- Fitur baru ini tidak mengubah protokol atau implementasi QRIS, gateway WhatsApp, maupun Baileys.

## 9. Tech Stack

| Lapisan | Teknologi |
|---|---|
| Web | Astro, HTML, Tailwind CSS, JavaScript |
| Hosting web | Vercel adapter |
| Database/Auth/Realtime/Storage | Supabase PostgreSQL, Supabase Auth, Realtime, Storage, Row Level Security, RPC |
| Serverless | Supabase Edge Functions (Deno/TypeScript) |
| Operasional terjadwal | PostgreSQL `pg_cron`, sinkronisasi per menit |
| WhatsApp | Node.js gateway terpisah dan Baileys |

## 10. Ketergantungan dan Kriteria Penerimaan

- Migration jadwal telah diterapkan pada Supabase dan extension `pg_cron` aktif.
- Tenant dengan jadwal terisi berubah status pada batas jadwal; jadwal lintas tengah malam juga dihitung benar.
- RPC manual hanya dapat dipanggil pemilik tenantnya dan menetapkan `override_until` ke batas berikutnya.
- Override aktif tidak ditimpa cron; setelah berakhir, status otomatis kembali sesuai jadwal.
- Tanpa jadwal, kontrol manual tetap bekerja.
- Admin dapat menyimpan jam buka dan tutup yang valid; nilai parsial/sama ditolak dengan pesan yang jelas.
- Di layar kecil, tombol sidebar mahasiswa hanya menampilkan satu ikon sesuai keadaan drawer.
- Build Astro lulus dan perubahan tampilan tidak mengubah alur QRIS atau gateway WhatsApp.
