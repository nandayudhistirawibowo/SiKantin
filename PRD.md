# Product Requirements Document (PRD) — SiKantin

**Produk:** SiKantin — Sistem Informasi Kantin Universitas Yatsi Madani

**Jenis dokumen:** Ringkasan kebutuhan produk dan kondisi implementasi

**Audiens:** Tim produk, frontend, backend, QA, operator kampus, dan presenter

**Status:** Menggambarkan aplikasi dan migrasi yang tersedia di repository. Bagian yang belum tersedia ditandai secara eksplisit, bukan diasumsikan sudah berjalan.

## 1. Ringkasan Produk

SiKantin adalah aplikasi web untuk menemukan tenant kantin kampus, melihat katalog menu, membuat pesanan, dan mengikuti status pesanan. Pengunjung dapat checkout sebagai guest; mahasiswa yang login memperoleh checkout dengan data profil, favorit, riwayat, dan akses untuk memberi rating setelah pesanan selesai. Tenant menangani pesanan dan operasional kantinnya. Admin mengelola akun, tenant, menu, dan jadwal.

Transaksi disimpan pada Supabase. Bukti QRIS diperiksa manusia; aplikasi tidak mengonfirmasi pembayaran dari jaringan pembayaran. WhatsApp digunakan sebagai kanal notifikasi tambahan melalui gateway terpisah yang menggunakan Baileys. Status pesanan dan token pelacakan tetap bersumber dari database.

## 2. Latar Belakang dan Masalah

Pemesanan langsung di kantin berpotensi menimbulkan antrean pada jam istirahat. Mahasiswa juga perlu mengetahui tenant yang tersedia, harga/menu, dan status pesanan tanpa harus mendatangi setiap kantin. Bagi tenant, pesanan dari beberapa pembeli perlu ditata agar antrean, pembayaran, dan proses penyiapan lebih mudah dikelola.

SiKantin menyatukan katalog tenant dan menu dengan alur pemesanan web. Setelah checkout, pembeli menerima nomor pesanan, nomor antrean, dan token untuk melihat status. Tenant mengelola order dari dashboard; WhatsApp dapat membantu menyampaikan informasi status tanpa menjadi satu-satunya sumber informasi.

## 3. Tujuan Produk

1. Memudahkan mahasiswa menemukan kantin dan menu kampus melalui web.
2. Memungkinkan pemesanan tanpa membuat akun, serta menyediakan pengalaman lebih personal untuk mahasiswa login.
3. Memberikan tenant satu tempat untuk melihat antrean dan memperbarui status pesanan.
4. Memberikan nomor antrean harian per tenant dan token pelacakan pesanan.
5. Mengurangi ketergantungan pada komunikasi manual dengan menyediakan status database, realtime, dan notifikasi WhatsApp tambahan.
6. Mengelola jadwal buka/tutup otomatis sambil mempertahankan override manual tenant.
7. Membatasi akses data melalui autentikasi, role, Row Level Security (RLS), dan validasi server-side.

## 4. Indikator Keberhasilan

- Pengunjung dapat menemukan tenant, membuka katalog, dan memulai checkout dari perangkat mobile maupun desktop.
- Checkout yang berhasil membuat satu order dengan detail item, total hasil hitung server, nomor antrean, dan token unik.
- Mahasiswa dapat melacak order dengan token, termasuk jika tidak memiliki akun.
- Tenant dapat menemukan order baru dan mengubah status sesuai alur yang tersedia.
- Perubahan status disimpan di database; realtime dan WhatsApp bertindak sebagai kanal tambahan.
- Status tenant mengikuti jam buka/tutup WIB, kecuali selama override manual masih aktif.
- Data sensitif dan operasi role terjaga oleh policy database atau Edge Function yang melakukan pemeriksaan identitas/role.
- Build web berhasil; alur yang bergantung pada konfigurasi eksternal diuji pada environment Supabase yang sesuai.

## 5. Target Pengguna dan Kebutuhan

| Persona | Kebutuhan | Hasil yang diharapkan |
|---|---|---|
| Mahasiswa guest | Cepat memesan tanpa registrasi dan tidak kehilangan cara melacak order. | Checkout dengan NIM/nomor HP, nomor antrean, token, dan halaman cek pesanan. |
| Mahasiswa login | Tidak berulang kali mengisi informasi; ingin mengakses pesanan dan kantin favorit. | Profil, auto-fill checkout, riwayat, favorit, dan rating. |
| Pemilik tenant | Mengetahui pesanan baru, memeriksa bukti QRIS, mengelola status, dan mengatur jam operasional. | Dashboard tenant dengan order, antrean, tombol status, menu, dan override buka/tutup. |
| Admin | Mengelola data platform dan membantu pemulihan akun mahasiswa. | Dashboard CRUD pengguna/tenant/menu, konfigurasi jadwal, dan Edge Function reset password. |

## 6. Ruang Lingkup Fitur per Role

### 6.1 Mahasiswa / Pengunjung Guest

- Melihat katalog tenant, lokasi, status buka/tutup, rating, dan kisaran harga yang tersedia.
- Membuka katalog menu per tenant; mencari, menyaring kategori, mengurutkan harga, memilih jumlah, dan add-on.
- Memasukkan NIM dan nomor HP/WhatsApp secara manual.
- Mengunggah bukti pembayaran QRIS sesuai batas format/ukuran aplikasi.
- Melihat konfirmasi, nomor pesanan, nomor antrean, dan token.
- Membuka halaman **Cek Pesanan** dengan token untuk melihat item, total, status, dan pembaruan realtime.
- Memberi rating tenant setelah pesanan berstatus selesai.

### 6.2 Mahasiswa Login

- Login memakai NIM dan password; alamat Auth dibentuk dengan pola `[NIM]@uym.ac.id`.
- Akun mahasiswa baru dibuat admin menggunakan NIM, nama, dan nomor WhatsApp; sistem membuat password Auth sementara acak dan mengirimkannya melalui WhatsApp tanpa mengirim email.
- Setelah login pertama kali, mahasiswa wajib mengganti password sementara melalui Profil. Password baru diperbarui melalui Supabase Auth.
- Jika lupa password, mahasiswa menghubungi admin untuk reset manual; tautan reset email tidak digunakan.
- Memperbarui profil, nomor HP, avatar, dan password.
- Memilih tenant favorit dan melihatnya di dashboard.
- Checkout dengan data NIM dan nomor HP dari profil terisi otomatis. Profil harus memenuhi validasi sebelum checkout.
- Melihat maksimal tiga pesanan terbaru di dashboard serta daftar riwayat penuh.
- Memberi rating tenant setelah pesanan selesai melalui token/order yang tersedia.
- Jika akun ditandai perlu reset password, dashboard mengarahkan mahasiswa ke halaman ganti password sebelum penggunaan fitur mahasiswa.

### 6.3 Pemilik Tenant

- Login ke dashboard dan hanya mengelola data tenant yang terkait dengan akunnya.
- Melihat ringkasan penjualan, pesanan baru, pesanan yang perlu diproses, pesanan siap diambil, dan riwayat.
- Memeriksa detail pesanan serta bukti pembayaran QRIS yang diunggah.
- Untuk pesanan QRIS, melakukan tindakan verifikasi manual pada dashboard tenant: menerima ke proses atau menolak dengan alasan.
- Mengubah status order melalui kontrol dashboard: status proses, siap diambil, dan selesai sesuai status awal.
- Mengelola ketersediaan dan informasi menu tenant pada cakupan akses yang diberikan aplikasi.
- Membuka/menutup tenant secara manual. Jika jadwal tersedia, status manual berlaku sampai perubahan jadwal berikutnya.
- Melihat pembaruan status pesanan dan status operasional melalui realtime.

### 6.4 Admin

- Mengelola data pengguna, termasuk mahasiswa dan pemilik tenant.
- Mendaftarkan mahasiswa dengan NIM, nama, dan nomor WhatsApp; password tidak dimasukkan pada formulir admin.
- Mengirim password sementara melalui WhatsApp; jika pengiriman gagal, menampilkan password sementara kepada admin untuk disampaikan secara aman.
- Mengelola tenant, pemilik, kontak, QRIS, serta jam buka/tutup.
- Mengelola menu, harga, ketersediaan, gambar, dan add-on.
- Memicu reset password mahasiswa melalui Edge Function `admin-reset-password`; endpoint memverifikasi role admin dan hanya menerima target ber-role mahasiswa.
- **Batasan verifikasi pembayaran:** implementasi yang tersedia menempatkan tindakan verifikasi bukti QRIS di dashboard tenant. Dashboard admin belum menyediakan tindakan verifikasi pembayaran. Jangan mempresentasikan verifikasi pembayaran sebagai fitur admin yang sudah tersedia.
- Melihat ringkasan data yang tersedia pada dashboard.

## 7. Aturan Produk dan Operasional

### 7.1 Jadwal Tenant

- `jam_buka` dan `jam_tutup` menggunakan tipe `time` dan zona interpretasi `Asia/Jakarta` (WIB).
- Jadwal berulang setiap hari; belum ada konfigurasi hari operasional atau hari libur.
- Jam buka lebih kecil dari jam tutup berarti rentang pada hari yang sama dengan awal inklusif dan akhir eksklusif.
- Jam tutup lebih kecil dari jam buka berarti jadwal melintasi tengah malam.
- Jam yang sama ditolak; kedua kolom harus sama-sama terisi atau sama-sama kosong.
- `pg_cron` menjalankan sinkronisasi setiap menit. Perubahan status dapat terlambat hingga satu interval scheduler.
- Override manual disimpan di `override_until` dan dipertahankan hingga batas jadwal buka/tutup berikutnya. Setelah itu scheduler menerapkan status sesuai jadwal.
- Tanpa jadwal, scheduler tidak memiliki rentang untuk dihitung; tenant tetap dapat mengubah status manual.
- Mengubah jadwal melalui panel admin menghapus override aktif agar konfigurasi terbaru berlaku.

### 7.2 Order dan Antrean

- Order dibuat melalui Edge Function yang memvalidasi tenant buka, NIM yang terdaftar, profil login bila ada, menu tersedia, add-on yang sah, kuantitas, harga, bukti transfer, dan total.
- Nilai harga dan subtotal dihitung dari data yang dibaca server, bukan dipercaya dari browser.
- Nomor antrean dibuat oleh fungsi database per tenant dan tanggal lokal WIB, misalnya `A-01`; counter dimulai kembali pada tanggal berikutnya.
- Token order adalah kredensial pelacakan. Token tidak boleh dibagikan secara publik.
- Checkout guest yang aktif saat ini menggunakan QRIS dan status awal `Menunggu Verifikasi`.

### 7.3 Status Pesanan

Status yang dijumpai pada implementasi saat ini:

1. `Menunggu Verifikasi` — order QRIS baru menunggu pemeriksaan tenant.
2. `Menunggu` — status pesanan menunggu yang dapat muncul pada alur dashboard.
3. `Diproses` — tenant menerima/verifikasi pembayaran dan mulai menyiapkan pesanan.
4. `Siap diambil` — pembeli dapat mengambil pesanan.
5. `Selesai` — order selesai; rating dapat diberikan.
6. `Dibatalkan` — pesanan ditolak/dibatalkan; alasan dapat disimpan.

Status disimpan sebagai teks pada baseline yang ada. Seluruh transisi perlu mengikuti tombol dan validasi status pada dashboard; daftar di atas bukan pernyataan bahwa setiap transisi bebas dilakukan.

### 7.4 Pembayaran dan WhatsApp

- QRIS adalah pembayaran manual. Unggah bukti tidak otomatis mengonfirmasi dana diterima.
- Tenant memeriksa bukti sebelum menandai pembayaran terverifikasi/memproses pesanan.
- Baileys digunakan oleh gateway WhatsApp terpisah. Ketersediaan bergantung pada koneksi gateway, konfigurasi environment, dan sesi WhatsApp.
- Kegagalan pengiriman WA tidak boleh diperlakukan sebagai bukti order tidak tersimpan. Pembeli tetap dapat memakai token dan dashboard.
- Nomor antrean/status database menjadi sumber data; notifikasi hanya kanal penyampaian.

## 8. Alur Bisnis Utama

1. Pembeli membuka beranda dan memilih tenant yang buka.
2. Pembeli memilih menu, jumlah, dan add-on.
3. Guest mengisi NIM serta nomor HP; mahasiswa login memakai data profil yang telah diisi otomatis.
4. Checkout mengirim informasi order dan bukti QRIS. Edge Function melakukan validasi ulang ke Supabase.
5. Server menghitung harga dan total, membuat token, mendapatkan nomor antrean, lalu menyimpan `orders` dan `order_items`.
6. Sistem mencoba mengirim WhatsApp melalui gateway terpisah dan menampilkan konfirmasi order.
7. Tenant memeriksa bukti pembayaran secara manual, menerima/menolak order, lalu memperbarui status hingga siap diambil/selesai.
8. Pembeli melacak order melalui token dan realtime. Setelah selesai, pembeli dapat mengirim rating bintang.

## 9. Kebutuhan Nonfungsional

- **Responsif:** halaman publik dan dashboard harus dapat digunakan pada viewport mobile dan desktop.
- **Aksesibilitas:** kontrol menggunakan label, fokus keyboard, status live yang relevan, dan mempertimbangkan `prefers-reduced-motion`.
- **Keamanan:** jangan mengekspos service-role key ke browser; role dan hak akses database ditegakkan server-side/RLS.
- **Integritas transaksi:** server menghitung harga, subtotal, status tenant, dan kelayakan item sebelum menyimpan order.
- **Ketersediaan:** halaman lacak order tetap bersumber dari database ketika WhatsApp tidak tersedia.
- **SEO:** beranda dan katalog tenant memiliki title/description/metadata sosial; halaman private menggunakan `noindex`.
- **Privasi:** gunakan akun, NIM, nomor, token, QRIS, dan bukti sintetis untuk demonstrasi. Jangan menampilkan data produksi.

## 10. Tech Stack dan Arsitektur

| Komponen | Teknologi / tanggung jawab |
|---|---|
| Frontend | Astro, HTML, JavaScript, Tailwind CSS, komponen dan script Astro. |
| Hosting web | Adapter Vercel untuk deployment aplikasi. |
| Database | Supabase PostgreSQL, SQL migrations, RPC dan trigger. |
| Auth | Supabase Auth; profil dan role aplikasi berada di `public.profiles`. |
| File | Supabase Storage untuk avatar, gambar menu, QRIS, dan bukti transfer. |
| Akses data | RLS dan privilege Postgres; beberapa operasi guest berjalan melalui Edge Function/RPC terkontrol. |
| Realtime | Supabase Realtime untuk status tenant dan pesanan. |
| Serverless | Supabase Edge Functions (Deno/TypeScript) untuk checkout, validasi NIM, pengelolaan akun, dan notifikasi. |
| Operasional otomatis | Ekstensi PostgreSQL `pg_cron` untuk sinkronisasi status tenant tiap menit. |
| WhatsApp | Gateway Node.js terpisah dengan Baileys; Ngrok dapat digunakan sebagai tunnel saat pengembangan lokal. |

## 11. Batasan dan Risiko

- QRIS manual; tidak ada payment gateway atau konfirmasi pembayaran otomatis.
- Baileys adalah integrasi WhatsApp tidak resmi dan bergantung pada layanan/sesi eksternal. Perubahan protokol, pemblokiran akun, jaringan, atau gateway dapat memengaruhi notifikasi.
- Email Auth mahasiswa memakai alamat internal sintetis berbasis NIM untuk autentikasi Supabase; aplikasi tidak mengirim email.
- Password reset admin menggunakan password sementara tetap yang ditentukan implementasi saat ini. Akses dan penyampaian harus dibatasi, mahasiswa wajib menggantinya, dan mekanisme ini sebaiknya ditinjau sebelum penggunaan produksi.
- Scheduler memerlukan `pg_cron`, izin, dan migration diterapkan pada proyek Supabase.
- Penomoran antrean ditentukan per tenant/tanggal WIB, bukan antrean kampus global.
- Jadwal saat ini berulang tiap hari tanpa kalender libur, hari khusus, atau jadwal mingguan.
- Baseline DDL core tables tidak seluruhnya tersedia di repository. Tipe/FK/constraint aktual core table perlu dicocokkan dengan database Supabase sebelum restore/migrasi.
- Policies yang dibuat langsung pada Supabase Dashboard tidak otomatis tercatat dalam repository dan perlu diaudit saat deployment.
- Dashboard admin belum memiliki aksi verifikasi pembayaran; verifikasi berjalan dari dashboard pemilik tenant.

## 12. Di Luar Ruang Lingkup

- Pembayaran otomatis, settlement, refund otomatis, dan rekonsiliasi QRIS.
- Kalender libur atau jadwal operasional berbeda per hari.
- Sistem reward/poin produksi (dashboard dapat menampilkan dummy).
- Penggantian gateway WhatsApp, implementasi Baileys, atau pembuatan ulang sesi.
- Klaim bahwa WhatsApp pasti terkirim pada setiap order.
- Verifikasi pembayaran dari dashboard admin sebelum fitur tersebut benar-benar diimplementasikan.

## 13. Kriteria Penerimaan

### Pembeli

- Guest dapat menelusuri tenant/menu, mengisi identitas, mengunggah bukti, dan menerima token serta antrean bila checkout valid.
- Pesanan dapat dicari melalui token dan menunjukkan status yang tersimpan.
- Mahasiswa login dapat auto-fill profil, melihat favorit/riwayat, dan memberi rating setelah selesai.

### Tenant

- Tenant hanya dapat mengakses pesanan/operasional tenant miliknya.
- Bukti QRIS tersedia untuk pemeriksaan manual.
- Tenant dapat mengubah status order sesuai alur dashboard dan melakukan override manual buka/tutup.
- Status otomatis menghormati jadwal WIB dan override sampai jadwal berikutnya.

### Admin

- Admin dapat membuat mahasiswa menggunakan NIM, nama, dan nomor WhatsApp tanpa menetapkan password yang diketahui.
- Password sementara mahasiswa dibuat acak dan dikirim ke nomor WhatsApp yang didaftarkan admin; setelah login, mahasiswa wajib menggantinya melalui Profil.
- Reset password hanya dapat dipanggil oleh admin dan targetnya hanya mahasiswa.
- Panel admin menyediakan CRUD tenant/menu dan field jadwal; verifikasi pembayaran dicatat sebagai tindakan tenant saat ini.

### Teknis

- Build Astro lulus.
- Migration database terpasang dan cron job berjalan pada Supabase target.
- Edge Function pendaftaran mahasiswa dan gateway WhatsApp diuji pada proyek Supabase yang memiliki secret dan konfigurasi runtime sesuai domain aplikasi.
- Skenario QRIS/WA tidak berubah hanya karena perubahan dokumentasi atau UI.
