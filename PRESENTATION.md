# Panduan Presentasi SiKantin UYM

Panduan ini membantu tim mempresentasikan produk dalam sekitar **7–10 menit**. Spesifikasi kebutuhan ada di [PRD.md](./PRD.md), alur sistem pada [FLOWCHART.md](./FLOWCHART.md), struktur data/RLS pada [DATABASE.md](./DATABASE.md), dan pembagian anggota tim pada [ROLES.md](./ROLES.md).

## 1. Tujuan Presentasi

Tunjukkan masalah pemesanan kantin, peragakan alur pembeli sampai tenant, lalu jelaskan bagaimana database, validasi server-side, token, antrean, realtime, dan WhatsApp mendukung proses.

**Narasi pembuka yang disarankan:**

> “SiKantin UYM membantu mahasiswa Universitas Yatsi Madani menemukan menu kantin dan memesan lebih awal, baik sebagai guest maupun mahasiswa login. Tenant mengelola pesanan, verifikasi bukti QRIS, dan status melalui dashboard; token dan database tetap menjadi sumber informasi order, sedangkan WhatsApp hanya kanal tambahan. Pembayaran QRIS masih diperiksa manual, Baileys bukan API resmi, dan konfigurasi Supabase live harus diverifikasi sebelum menyatakan seluruh kontrol produksi aktif.”

## 2. Persiapan Demo

### Akun dan data

- Akun demo peran mahasiswa, tenant, dan admin.
- Mahasiswa memiliki NIM demo; password awalnya adalah NIM dan telah diganti pada akun yang dipakai untuk demo.
- Satu tenant demo dengan jam operasional, menu tersedia, add-on opsional, harga, serta gambar QRIS demo.
- Satu order demo yang statusnya dapat dilanjutkan dari `Menunggu Verifikasi` ke status berikutnya.
- Satu order demo selesai agar rating, feedback opsional, ringkasan pembeli, dan riwayat tenant dapat diperagakan.
- Token demo untuk halaman Cek Pesanan.
- Bukti QRIS sintetis; jangan gunakan transaksi/bukti asli.

### Infrastruktur

- Pastikan aplikasi web dan Supabase target dapat diakses.
- Pastikan Realtime tersedia bila ingin memperlihatkan perubahan langsung.
- Untuk demo pengiriman WA, gateway dan sesi uji harus sudah aktif. Jangan melakukan login ulang atau mengubah sesi Baileys di tengah presentasi.
- Akun mahasiswa demo memakai NIM sebagai password awal. Siapkan password baru untuk menggantinya melalui Profil; tidak ada email aktivasi atau reset password.
- Fitur jadwal otomatis memerlukan migration sudah diterapkan dan job `pg_cron` berjalan.
- Siapkan data order pada periode yang berbeda bila ingin memperlihatkan filter statistik tenant.
- Pastikan migration feedback/Realtime telah diterapkan pada proyek demo. Repository bukan dump live; verifikasi publication, policy, dan job di Supabase target.
- Untuk menampilkan sitemap, pastikan migration yang memberi akses baca publik ke `tenants` sudah diterapkan dan `PUBLIC_SUPABASE_URL` serta `PUBLIC_SUPABASE_ANON_KEY` tersedia di deployment.
- Siapkan video/screenshot atau order cadangan bila koneksi, Realtime, atau WA lambat.

### Keamanan presentasi

- Gunakan data sintetis, bukan NIM, telepon, token, bukti pembayaran, email, atau kredensial pengguna nyata.
- Jangan menampilkan service-role key, secret `WA_API_KEY`, konfigurasi environment, isi sesi Baileys, QR login WhatsApp, atau URL publik bukti pembayaran.
- Password awal dan password hasil reset admin sama dengan NIM dan mudah ditebak. Jangan menampilkan atau menggunakan NIM asli saat demo; gunakan akun uji dan segera ganti password setelah login.

## 3. Alur Demo Langkah demi Langkah

| Waktu | Langkah | Yang diperagakan | Narasi / poin utama |
|---|---|---|---|
| 0:00–0:45 | Masalah dan beranda | Tunjukkan katalog, nama tenant, lokasi, status buka/tutup, dan harga awal. | “Mahasiswa bisa melihat pilihan lebih dulu, sehingga pencarian dan keputusan makan lebih praktis.” |
| 0:45–1:30 | Katalog tenant | Buka satu tenant; cari/filter menu, harga, jumlah, add-on. | “Katalog memberi informasi untuk memilih; ketersediaan serta harga akhir tetap diverifikasi server.” |
| 1:30–2:30 | Checkout guest | Pilih menu/add-on di katalog, tekan **Lanjut ke Checkout**, verifikasi ringkasan, isi NIM/nomor kontak demo, lalu unggah gambar sintetis. Jelaskan QRIS manual. | “Guest bisa pesan tanpa membuat akun. Menu dibawa ke halaman checkout terpisah; bukti QRIS tidak otomatis dianggap lunas.” |
| 2:30–3:00 | Konfirmasi pesanan | Tunjukkan nomor pesanan, nomor antrean, token cek. | “Token memungkinkan pembeli melacak status; simpan token sebagai informasi rahasia.” |
| 3:00–4:00 | Dashboard tenant | Buka order yang disiapkan; periksa bukti, verifikasi manual, ubah status sampai siap diambil, lalu tunjukkan filter ringkasan dan riwayat selesai. | “Tenant memeriksa bukti dan mengelola status. Ringkasan dapat difilter per periode; pendapatan mengecualikan order batal. Riwayat menampilkan rincian menu/add-on, rating, feedback opsional, dan waktu selesai.” |
| 4:00–4:40 | Cek Pesanan | Masukkan token demo; perlihatkan status, rincian, rating, dan saran opsional pada order selesai. | “Pelacakan dan pengiriman rating memakai token order. Feedback bersifat opsional; data rating/masukan masuk ke riwayat tenant.” |
| 4:40–5:20 | WhatsApp | Jika gateway uji siap, tampilkan pesan demo/status delivery. Jika tidak, tunjukkan simulasi/screenshot yang sudah disiapkan. | “Baileys adalah gateway terpisah dan tidak resmi; notifikasi merupakan kanal tambahan dan dapat gagal.” |
| 5:20–6:10 | Login mahasiswa | Tunjukkan profil, data checkout auto-fill, favorit, riwayat, atau rating order selesai. | “Login menambahkan kenyamanan; guest checkout tetap tersedia.” |
| 6:10–7:00 | Admin dan reset | Tunjukkan pengelolaan tenant/menu/jadwal. Tunjukkan reset password hanya pada akun demo dan jangan tampilkan kredensial di proyektor. | “Admin mendaftarkan mahasiswa dengan NIM/nama dan password awal NIM; mahasiswa menggantinya melalui Profil. Reset darurat dibatasi role.” |
| 7:00–7:40 | Jadwal dan penutup | Jelaskan override manual dan sinkronisasi per menit; sebutkan risiko/batasan dan kebutuhan verifikasi konfigurasi live. | “Sistem menyatukan katalog, order, antrean, status, dan komunikasi dengan batasan yang transparan. Repository menunjukkan rancangan/migrasi, tetapi bukan bukti konfigurasi Supabase produksi.” |

### Jalur demo singkat (3–4 menit)

Beranda → satu katalog → `/checkout` dengan ringkasan menu → token dan `/cek-pesanan` → dashboard tenant. Jelaskan QRIS manual, redirect kembali sesuai asal pembeli, dan WA sebagai notifikasi tambahan; jangan menunggu transaksi atau pesan sungguhan.

## 4. Poin Penting untuk Dosen/Teman

### Problem solving

- Informasi tenant/menu terpusat di satu katalog kampus.
- Pembeli dapat memesan tanpa harus membuat akun.
- Nomor antrean dan status mengurangi ketidakjelasan setelah checkout.
- Tenant memperoleh dashboard untuk melihat order dan mengatur status.
- Add-on dan harga tambahannya tampil di rincian item order; perubahan order disinkronkan melalui Supabase Realtime antartab.
- Pembeli dapat memberi rating dan feedback opsional setelah order selesai; tenant melihatnya pada riwayat order selesai.
- Filter statistik tenant menggunakan periode Hari Ini, 7 Hari Terakhir, atau Bulan Ini dalam tanggal WIB.

### Integritas dan keamanan

- Edge Function membaca ulang tenant, status buka, NIM, item tersedia, harga, dan add-on.
- Total tidak dipercayakan pada nilai yang dikirim browser.
- RLS memisahkan akses mahasiswa, pemilik tenant, admin, dan guest; operasi privileged menggunakan service role hanya di sisi server.
- Token order memberi akses pelacakan dan harus disimpan/dibagikan dengan hati-hati.
- Akun mahasiswa baru memakai NIM sebagai password awal. Admin mendaftarkan NIM dan nama saja; registrasi tidak mengirim email atau WhatsApp. Setelah login, mahasiswa mengganti password melalui Profil.

### Integrasi WhatsApp

- Web dan gateway WhatsApp adalah komponen terpisah.
- Baileys digunakan pada gateway tidak resmi; koneksi dan sesi menjadi ketergantungan eksternal.
- Kegagalan kirim WA tidak berarti database order gagal; token dan halaman cek menjadi fallback.
- Jangan mengklaim delivery WhatsApp selalu berhasil atau menggunakan layanan resmi bila bukan demikian.

### Batasan produk saat ini

- QRIS manual; pembayaran diverifikasi visual oleh tenant.
- Dashboard admin belum memiliki aksi verifikasi pembayaran.
- Jadwal buka/tutup berulang setiap hari tanpa kalender libur.
- Job jadwal berjalan per menit dan membutuhkan konfigurasi `pg_cron`.
- Password awal dan reset admin ditetapkan sama dengan NIM. Ini berisiko karena NIM bukan rahasia; ganti password setelah login dan gunakan hanya akun demo sintetis.
- WhatsApp hanya untuk notifikasi pesanan, bukan pendaftaran mahasiswa. Pengiriman WA tetap bergantung pada gateway dan sesi Baileys.

## 5. Q&A yang Mungkin Ditanyakan

### 1. Mengapa menggunakan Baileys?

Baileys menyediakan integrasi WhatsApp melalui gateway Node.js yang sudah terpisah dari web. Ini membantu mengirim notifikasi tanpa menjadikan WhatsApp sumber data order. Namun Baileys bukan API resmi WhatsApp Business, sehingga sesi, perubahan protokol, stabilitas, dan kebijakan layanan menjadi risiko yang harus dikelola.

### 2. Mengapa pembayaran QRIS masih manual?

SiKantin UYM saat ini menerima bukti transfer untuk diperiksa tenant; belum ada koneksi payment gateway atau callback pembayaran otomatis. Pendekatan manual membatasi ruang lingkup awal, tetapi status “bukti diunggah” tidak sama dengan “pembayaran terkonfirmasi”.

### 3. Bagaimana hosting dan arsitekturnya?

Frontend Astro dibangun menggunakan adapter Vercel. Auth, PostgreSQL, Storage, Realtime, dan Edge Functions menggunakan Supabase. Cloudflare menangani DNS/proxy/CDN jika diaktifkan untuk domain deployment; gateway WhatsApp berjalan sebagai komponen terpisah. Ngrok dapat membantu mengekspos gateway lokal untuk development, bukan sebagai pengganti deployment produksi.

### 4. Bagaimana mencegah harga diubah melalui browser?

Edge Function mengambil data menu dan add-on dari database, memvalidasi ketersediaan, lalu menghitung subtotal dan total di server. Nilai total dari browser tidak menjadi sumber kebenaran.

### 5. Apa yang terjadi jika WhatsApp tidak terkirim?

Order disimpan di database sebelum notifikasi dicoba. Pembeli tetap menerima token/nomor antrean dari alur checkout dan dapat memakai halaman Cek Pesanan. Gateway failure harus ditangani sebagai kegagalan notifikasi, bukan pembatalan order.

### 6. Bagaimana nomor antrean dibuat dan apakah global?

Nomor dibuat per tenant dan per tanggal `Asia/Jakarta`, misalnya `A-01`. Counter tiap tenant dimulai lagi pada tanggal berikutnya; nomor bukan antrean global untuk seluruh kampus.

### 7. Siapa yang memverifikasi pembayaran?

Saat ini pemilik tenant memeriksa bukti QRIS di dashboard tenant, lalu menerima atau menolak order. Dashboard admin belum memiliki tindakan verifikasi pembayaran. Ini perlu disebut sebagai batasan, bukan diklaim sudah tersedia.

### 8. Bagaimana jadwal buka/tutup otomatis dan override manual bekerja?

Admin menentukan jam buka/tutup WIB. `pg_cron` memperbarui status setiap menit. Pemilik tenant dapat melakukan override manual; status manual berlaku hingga batas jadwal buka/tutup berikutnya, lalu scheduler kembali menghitung status dari jadwal.

### 9. Bagaimana mahasiswa mengatur atau memulihkan password?

Admin membuat akun menggunakan NIM dan nama; password awalnya adalah NIM. Setelah login, mahasiswa mengganti password melalui Profil. Jika lupa password, mahasiswa meminta admin melakukan reset; password dikembalikan menjadi NIM dan harus segera diganti lagi. Alur ini tidak menggunakan SMTP atau email.

### 10. Apakah data guest dan akun terisolasi?

Mahasiswa login dibatasi oleh RLS berdasarkan user/tenant/admin. Guest tidak menulis order langsung ke tabel melalui browser; checkout diproses Edge Function dengan validasi server-side. Pelacakan guest menggunakan token unik, sehingga token perlu diperlakukan seperti kredensial.

### 11. Bagaimana menjaga data selama demo?

Gunakan akun demo, NIM dan nomor sintetis, bukti pembayaran contoh, dan token uji. Hindari memproyeksikan kredensial, service key, QR sesi Baileys, atau URL bukti pembayaran publik.

### 12. Apakah sistem mendukung hari libur dan jadwal berbeda tiap hari?

Belum. Implementasi saat ini menggunakan satu rentang jam yang berulang setiap hari dan scheduler per menit. Kalender libur dan aturan per hari dapat menjadi pengembangan berikutnya.

### 13. Mengapa bukti QRIS dapat diakses melalui URL publik?

Implementasi saat ini menyimpan URL bukti pada bucket `bukti-transfer` yang kebijakan repository-nya public-read agar dashboard tenant dapat menampilkan bukti. Ini memiliki risiko privasi: URL yang tersebar dapat diakses tanpa token order, sehingga jangan gunakan data pembayaran nyata saat demo dan konfigurasi live perlu dievaluasi.

### 14. Mengapa password awal mahasiswa sama dengan NIM?

Itu adalah alur pembuatan akun yang tersedia saat ini, bukan praktik keamanan ideal. NIM dapat diketahui pihak lain, sehingga risikonya tinggi; mahasiswa diminta mengganti password setelah login, dan demo hanya boleh memakai akun sintetis.

### 15. Apakah status deployment dan RLS sudah pasti sama dengan repository?

Belum dapat disimpulkan hanya dari repository. Migration mendokumentasikan konfigurasi yang diharapkan, tetapi sebelum menyatakan kondisi live, tim perlu mencocokkan tabel/kolom dan policy melalui `pg_catalog`/`pg_policies`, serta memeriksa publication Realtime dan job `pg_cron` pada proyek Supabase target.

## 6. Pembagian Tugas Tim

| Peran | Penanggung jawab | Fokus persiapan dan presentasi |
|---|---|---|
| Product Engineer / Lead | **Nanda Yudhistira Wibowo** | Menjelaskan latar belakang, target pengguna, prioritas, scope, metrik, dan keputusan produk; membuka serta menutup presentasi. |
| Product Designer | **Isya Prasetia** | Mendemonstrasikan dan menjelaskan alur UX, katalog, checkout, dashboard, responsive UI, dan aksesibilitas. |
| QA Engineer | **Rifqi Zaki Bahriansyah, Barkah** | Menyiapkan akun/data sintetis; menguji skenario guest/login/tenant/admin, validasi input, status, jadwal, fallback WA, SEO, sitemap/robots, dan build. |
| User Research | **Muhammad Dirham, Evandra Septian, Muhammad Afif Fadila** | Menjelaskan riset kantin, pencatatan menu, wawancara, kebutuhan pengguna, temuan yang benar-benar diperoleh, dan alasan UX. |

> Satu anggota boleh memegang lebih dari satu peran. Selaraskan pembagian dengan kontribusi aktual tim sebelum presentasi.

## 7. Checklist Sebelum Presentasi

- [ ] Beranda, katalog tenant, dan dashboard berhasil dimuat pada jaringan demo.
- [ ] Menu dan harga sesuai data demo; tenant demo berada pada status yang diperlukan.
- [ ] Token order demo telah disiapkan dan tidak berasal dari pembeli nyata.
- [ ] Bukti QRIS sintetis digunakan; tidak ada transaksi asli.
- [ ] Akun mahasiswa dapat login dan profilnya cukup lengkap untuk auto-fill.
- [ ] Password awal mahasiswa demo sudah diganti melalui Profil; alur reset admin diuji hanya dengan akun sintetis.
- [ ] Jika mendemokan Realtime, buka dashboard tenant di dua tab dan siapkan order uji untuk memperlihatkan sinkronisasi.
- [ ] Siapkan order selesai untuk mendemokan rating/feedback serta riwayat tenant, dan siapkan data periode berbeda bila filter statistik akan ditunjukkan.
- [ ] Pastikan migration feedback (`20261102000000_order_feedback.sql`) dan Realtime review (`20261103000000_tenant_reviews_realtime.sql`) telah diterapkan pada proyek demo; verifikasi publication `supabase_realtime` dan policy review.
- [ ] Gateway WA siap atau screenshot/video fallback sudah tersedia.
- [ ] Sitemap dapat diakses jika SEO/deployment akan didemokan; isinya hanya beranda/katalog tenant publik dan akses anon ke slug tenant telah diverifikasi.
- [ ] Migration jadwal dan cron telah diverifikasi di Supabase bila fitur jadwal didemokan.
- [ ] Jangan mengklaim konfigurasi Supabase live berdasarkan repository saja; verifikasi schema/policy lewat `pg_catalog`/`pg_policies` dan status job `pg_cron`.
- [ ] Kredensial, token, service key, nomor pribadi, dan QR sesi tidak terlihat di layar.
- [ ] Tim mengetahui dengan jelas bahwa verifikasi pembayaran dilakukan tenant, bukan admin.

## 8. Referensi Teknis

- Aplikasi Astro: [`sikantin-astro/`](./sikantin-astro/).
- SQL migrations: [`supabase/migrations/`](./supabase/migrations/).
- Supabase Edge Functions: [`supabase/functions/`](./supabase/functions/).
- Spesifikasi produk: [PRD.md](./PRD.md).
- Diagram proses: [FLOWCHART.md](./FLOWCHART.md).
- Struktur data dan RLS: [DATABASE.md](./DATABASE.md).
- Daftar anggota dan peran: [ROLES.md](./ROLES.md).
- Jalankan web dari `sikantin-astro/` dengan `npm run dev`; validasi build dengan `npm run build`.
