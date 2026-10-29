# Panduan Presentasi SiKantin

Dokumen ini adalah panduan menyampaikan dan mendemonstrasikan produk. Spesifikasi kebutuhan ada di [PRD.md](./PRD.md), alur sistem di [FLOWCHART.md](./FLOWCHART.md), dan struktur data/RLS di [DATABASE.md](./DATABASE.md).

## Sasaran Presentasi

Dalam 5–7 menit, tunjukkan masalah antrean dan informasi menu, peragakan pemesanan dari sisi mahasiswa dan tenant, lalu jelaskan bagaimana database, status realtime, dan WhatsApp mendukung proses. Gunakan akun demo dan data sintetis; jangan tampilkan kredensial, NIM, nomor pribadi, service-role key, ataupun sesi Baileys.

## Persiapan sebelum demo

- Pastikan aplikasi dan koneksi Supabase aktif; gunakan akun mahasiswa, tenant, dan admin demo yang sudah disiapkan.
- Pastikan ada tenant contoh yang buka, menu tersedia, QRIS demo, dan satu order untuk dilacak.
- Untuk memperlihatkan notifikasi, pastikan gateway uji siap; jangan memulai/mengubah sesi WhatsApp saat presentasi.
- Siapkan token order uji cadangan bila koneksi atau pengiriman pesan melambat.
- Minta izin sebelum mengunggah bukti pembayaran; pakai gambar sintetis, bukan bukti transaksi asli.

## Alur demo langkah demi langkah

| Waktu | Langkah | Yang diperagakan | Kalimat kunci |
|---|---|---|---|
| 0:00–0:40 | Pembukaan dan beranda | Tunjukkan katalog tenant, lokasi, rating, dan badge buka/tutup. | “SiKantin memusatkan informasi kantin kampus dan membuat mahasiswa bisa melihat pilihan sebelum datang.” |
| 0:40–1:20 | Katalog tenant | Buka tenant; cari/filter menu, harga, ketersediaan, dan add-on. | “Harga dan ketersediaan dibaca dari data tenant, bukan dipercayakan pada nilai yang dikirim browser.” |
| 1:20–2:20 | Checkout guest | Pilih menu, isi data demo, jelaskan unggah bukti QRIS. | “Mahasiswa dapat memesan tanpa registrasi. Pembayaran QRIS tetap diperiksa manual oleh tenant.” |
| 2:20–2:50 | Konfirmasi | Tunjukkan token pelacakan dan nomor antrean. Jangan membagikan token milik pengguna nyata. | “Token digunakan untuk melihat status; nomor antrean memudahkan urutan pengambilan.” |
| 2:50–3:50 | Dashboard tenant | Buka order demo, tunjukkan bukti, verifikasi manual, lalu ubah status. | “Perubahan pesanan tersimpan di database, terlihat realtime, dan notifikasi WhatsApp adalah kanal tambahan.” |
| 3:50–4:30 | Pelacakan pembeli | Buka halaman Cek Pesanan dengan token demo; tunjukkan perubahan status. | “Guest tetap dapat mengikuti status tanpa harus membuat akun.” |
| 4:30–5:00 | Rating / mahasiswa login | Jika waktu ada, tunjukkan rating setelah selesai atau dashboard mahasiswa/favorit. | “Akun mahasiswa memberi riwayat, profil, dan favorit; checkout guest tetap tersedia.” |
| 5:00–5:40 | Admin dan jadwal | Tunjukkan pengelolaan menu/tenant dan input jam buka/tutup. | “Jadwal dihitung pada WIB setiap menit. Tenant masih bisa override manual sampai batas jadwal berikutnya.” |
| 5:40–6:00 | Penutup | Ringkas manfaat dan batasan. | “SiKantin menghubungkan katalog, pesanan, antrean, status, dan komunikasi dalam satu alur.” |

### Jalur demo singkat bila waktu terbatas

Beranda → satu katalog → checkout/token demo (atau order yang sudah disiapkan) → dashboard tenant → Cek Pesanan. Jelaskan QRIS manual dan WhatsApp tanpa menunggu pesan sungguhan terkirim.

## Poin penting untuk dosen/teman

- **Masalah yang dijawab:** pencarian menu/tenant, antrean, dan kurangnya visibilitas status.
- **Alur guest:** akses langsung tanpa akun, dengan NIM/nomor kontak, token unik, dan nomor antrean.
- **Integritas transaksi:** harga/menu diperiksa ulang server; frontend tidak menjadi sumber nilai final order.
- **Pembayaran:** QRIS manual; gambar bukti bukan konfirmasi pembayaran otomatis.
- **Operasional:** jadwal harian memakai zona waktu Asia/Jakarta; perubahan manual tenant berakhir pada batas jadwal selanjutnya.
- **Realtime:** dashboard/katalog dapat mengikuti perubahan status tanpa reload manual.
- **WhatsApp:** gateway terpisah dari web; jika pesan gagal, order yang sudah disimpan tetap ada.
- **Keamanan:** role dan RLS memisahkan akses mahasiswa, pemilik, admin, dan guest; token order harus diperlakukan rahasia.
- **Batasan yang terbuka:** belum ada kalender libur, payment gateway, atau verifikasi pembayaran oleh dashboard Admin.

## Q&A yang mungkin ditanyakan

**Mengapa mahasiswa bisa checkout tanpa login?**

Supaya pemesanan tidak terhambat pembuatan akun. NIM dan nomor kontak tetap diminta; login menyediakan riwayat/favorit dan pengisian data otomatis.

**Apakah unggah bukti QRIS langsung berarti lunas?**

Tidak. Bukti hanya dikirim untuk diperiksa manual tenant. Sistem ini tidak terhubung ke payment gateway.

**Bagaimana jika WhatsApp tidak terkirim?**

Status kirim dilaporkan terpisah. Data order dan token disimpan di database, sehingga tenant/pembeli tetap dapat melanjutkan melalui dashboard dan halaman pelacakan.

**Bagaimana tenant bisa menutup kantin lebih awal?**

Tenant menekan kontrol Buka/Tutup Manual. Status manual dipertahankan sampai jadwal buka/tutup berikutnya; cron database lalu kembali menghitung status otomatis.

**Apakah jadwal mendukung kantin yang buka melewati tengah malam?**

Ya, jika jam tutup lebih awal daripada jam buka. Saat ini jadwal yang sama berulang setiap hari dan belum memiliki pengaturan hari libur.

**Siapa yang memverifikasi pembayaran?**

Saat ini pemilik tenant memeriksa bukti transfer pada dashboard tenant. Dashboard Admin mengelola pengguna/tenant/menu dan belum mempunyai tindakan verifikasi pembayaran.

**Apakah nomor antrean global?**

Tidak. Nomor bertambah untuk setiap tenant dalam satu tanggal WIB; hitungan mulai lagi pada tanggal berikutnya.

**Data apa yang harus disiapkan untuk demo?**

Akun demo per role, satu tenant/menu, bukti sintetis, dan token uji. Hindari data pribadi dan kredensial produksi.

## Pembagian tugas tim

| Peran | Tanggung jawab presentasi/proyek |
|---|---|
| Founder / Product Lead | Membuka presentasi, menjelaskan masalah, target, prioritas, dan keputusan produk. |
| Frontend | Mendemonstrasikan katalog, checkout, responsivitas, dashboard mahasiswa, dan aksesibilitas UI. |
| Backend | Menjelaskan model data Supabase, Edge Functions, validasi harga/checkout, RLS, RPC, dan Realtime. |
| Research | Menyampaikan kebutuhan pengguna, alur kampus, batasan QRIS manual, dan dasar keputusan UX. |
| QA | Menjelaskan skenario uji guest/login/tenant, validasi input, jadwal/override, kasus gagal, dan hasil build. |

## Referensi teknis untuk presenter

- Aplikasi Astro aktif: `sikantin-astro/`.
- Migration database: `supabase/migrations/`.
- Ringkasan kebutuhan: [PRD.md](./PRD.md).
- Diagram proses: [FLOWCHART.md](./FLOWCHART.md).
- Tabel, relasi, dan RLS: [DATABASE.md](./DATABASE.md).
- Jalankan web dari `sikantin-astro/` dengan `npm run dev`; validasi produksi dengan `npm run build`.
