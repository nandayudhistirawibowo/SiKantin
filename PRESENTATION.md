# SiKantin — Panduan Presentasi dan Belajar

Dokumen ini menjelaskan tujuan aplikasi, struktur repository, alur data, fitur yang tersedia, dan cara menjalankan proyek. Gunakan bagian **Alur Demo** untuk presentasi singkat dan bagian **Peta Folder** sebagai panduan saat mulai membaca kode.

## 1. Gambaran Proyek

SiKantin adalah aplikasi pemesanan makanan untuk lingkungan Universitas Yatsi Madani. Pengunjung dapat melihat tenant dan menu tanpa login, membuat pesanan guest dengan NIM dan nomor WhatsApp, lalu melacak status pesanan menggunakan token. Pemilik tenant mengelola pesanan dan status operasional melalui dashboard, sementara admin mengelola data tenant, pemilik, dan menu.

Sumber data utama adalah Supabase. Aplikasi menggunakan Astro (server output dengan Vercel adapter) untuk halaman web, Supabase PostgreSQL untuk data, Supabase Realtime untuk pembaruan status, Storage untuk bukti transfer, dan Edge Functions untuk validasi serta pembuatan pesanan. Notifikasi WhatsApp berjalan melalui proses Node.js terpisah yang menggunakan Baileys.

## 2. Peta Repository

```text
SiKantin V2/
├── PRESENTATION.md                 # Panduan presentasi dan belajar ini
├── .gitignore                      # Aturan file yang tidak boleh masuk Git
├── .vscode/                        # Pengaturan dan konfigurasi editor
├── index.js                        # Wrapper root yang meneruskan ke server/index.cjs
├── wa-service.js                   # Wrapper root yang meneruskan ke server/wa-service.cjs
├── favicon-uym.png                 # Favicon legacy/root
├── logo-uym.png                    # Logo legacy/root
├── package.json                    # Dependency kompatibilitas di root
├── package-lock.json               # Lockfile dependency root
├── css/
│   └── style.css                   # Stylesheet frontend legacy/root
├── js/
│   ├── admin-dashboard.js          # Script dashboard admin legacy/root
│   ├── app.js                      # Script frontend legacy/root
│   ├── notification-sound.js       # Script audio legacy/root
│   └── supabase.js                 # Klien Supabase legacy/root
├── auth_info_baileys/              # Sesi WhatsApp lokal; jangan dibagikan atau di-commit
├── sikantin-astro/                 # Aplikasi web Astro yang aktif
│   ├── src/
│   │   ├── assets/                 # Logo dan favicon
│   │   ├── layouts/Layout.astro    # Kerangka HTML dan metadata bersama
│   │   ├── lib/supabase-server.js  # Klien Supabase untuk rendering server
│   │   ├── pages/
│   │   │   ├── index.astro         # Beranda dan direktori tenant
│   │   │   ├── tenant/[slug].astro # Katalog dan checkout tenant
│   │   │   ├── tenant/[slug]/dashboard.astro # Route dashboard tenant berbasis slug
│   │   │   ├── tenant/login.astro  # Login pemilik tenant
│   │   │   ├── tenant-dashboard.astro
│   │   │   ├── tenant-login.astro
│   │   │   ├── cek-pesanan.astro  # Pelacakan pesanan dan rating tenant
│   │   │   ├── admin/
│   │   │   │   ├── dashboard.astro
│   │   │   │   ├── index.astro
│   │   │   │   └── login.astro
│   │   │   ├── admin-dashboard.astro
│   │   │   ├── dashboard.astro
│   │   │   ├── login.astro
│   │   │   └── profile.astro
│   │   ├── scripts/
│   │   │   ├── admin-dashboard.js
│   │   │   ├── notification-sound.js
│   │   │   └── supabase.js
│   │   └── styles/                 # CSS global dan per halaman
│   ├── database/
│   │   └── mysql-schema.sql        # Referensi skema lama; bukan migrasi Supabase aktif
│   ├── server/                     # Gateway Node.js/WhatsApp (Baileys)
│   ├── .env.example                # Contoh konfigurasi, tanpa nilai rahasia aktif
│   ├── astro.config.mjs            # Astro, Vercel adapter, Tailwind, dan redirect
│   ├── package.json                # Dependency dan perintah aplikasi
│   └── README.md                   # Petunjuk setup dan integrasi
└── supabase/
    ├── functions/
    │   ├── create-guest-order/index.ts
    │   ├── create-user/index.ts
    │   ├── lookup-guest-order/index.ts
    │   ├── manage-user/index.ts
    │   └── validate-nim/index.ts
    ├── migrations/                 # Perubahan skema database PostgreSQL
    └── config.toml                 # Konfigurasi lokal Supabase Functions
```

`sikantin-astro/server/` berisi `env.cjs`, `index.cjs`, `lib/supabase.cjs`, `wa-service.cjs`, dan `wa.cjs`. Folder `node_modules/`, `.astro/`, `dist/`, dan `.vercel/` adalah hasil instalasi/build. Folder tersebut bukan sumber fitur dan tidak perlu diedit manual. `auth_info_baileys/` berisi kredensial sesi WhatsApp lokal, bukan materi presentasi untuk dibagikan.

### Route utama di `sikantin-astro/src/pages/`

| File | Route | Fungsi |
|---|---|---|
| `index.astro` | `/` | Direktori tenant, status buka/tutup, rating tenant, dan filter tenant. |
| `tenant/[slug].astro` | `/tenant/<slug>` | Katalog tenant, keranjang, checkout guest, serta status buka/tutup realtime. |
| `cek-pesanan.astro` | `/cek-pesanan` | Pencarian token, nomor antrean, status realtime, dan rating setelah pesanan selesai. |
| `tenant-dashboard.astro` | `/tenant-dashboard` | Pesanan masuk, antrean, menu, riwayat, dan kontrol status kantin. |
| `tenant/[slug]/dashboard.astro` | `/tenant/<slug>/dashboard` | Memastikan tenant tersedia berdasarkan slug, lalu me-rewrite ke dashboard tenant. |
| `tenant-login.astro`, `tenant/login.astro` | `/tenant/login` | Halaman autentikasi pemilik tenant. |
| `admin/login.astro` | `/admin/login` | Halaman autentikasi admin. |
| `admin/dashboard.astro`, `admin-dashboard.astro` | `/admin/dashboard` dan route kompatibilitas | Dashboard pengelolaan admin. |
| `login.astro`, `dashboard.astro`, `profile.astro` | Route kompatibilitas/profil | Halaman login, dashboard, dan profil yang masih ada dalam proyek. |

Astro memetakan file di `src/pages` menjadi route. Kurung siku `[slug].astro` menandakan segmen URL dinamis: nama tenant dibaca dari URL, lalu datanya diambil dari database.

### CSS, script, dan komponen bersama

- `src/layouts/Layout.astro` membungkus halaman dengan struktur HTML dasar dan metadata SEO.
- `src/styles/global.css` berisi gaya global; file CSS lain di `src/styles/` mengatur halaman atau fitur tertentu.
- `src/scripts/supabase.js` menyediakan klien Supabase browser. `src/lib/supabase-server.js` menyediakan klien yang dipakai saat rendering server.
- `src/scripts/notification-sound.js` mengatur audio notifikasi setelah interaksi pengguna.
- Script yang berada di dalam file `.astro` menangani interaksi khusus halaman, misalnya filter katalog, keranjang, Realtime, dan dashboard.
- Dashboard tenant memulai inisialisasi pada `DOMContentLoaded` (atau langsung jika dokumen sudah siap), memeriksa sesi/role, lalu memanggil `loadOrders()` dan memuat menu.
- Beranda dan katalog tenant berlangganan ke `UPDATE` tabel `tenants`. Badge dan kontrol checkout mengikuti `status_buka` terbaru, termasuk snapshot awal setelah Realtime tersambung.

## 3. Backend Supabase dan Integrasi

### Edge Functions

| Folder | Tanggung jawab |
|---|---|
| `validate-nim/` | Memvalidasi NIM mahasiswa. |
| `create-guest-order/` | Memvalidasi checkout, mengambil harga/menu yang sah dari database, membuat antrean dan pesanan, menyimpan detail, lalu mencoba notifikasi WhatsApp. |
| `lookup-guest-order/` | Endpoint pencarian pesanan guest dengan token. Halaman cek pesanan juga memakai RPC database yang mengembalikan ringkasan pesanan. |
| `create-user/` | Membantu pembuatan akun oleh admin. |
| `manage-user/` | Operasi pengelolaan akun oleh admin. |

`supabase/config.toml` menentukan apakah function memerlukan verifikasi JWT. Guest checkout dan validasi NIM menerima request guest dan harus melakukan validasi input di dalam function; operasi admin harus memeriksa autentikasi dan izin.

### Migration penting

Migration dijalankan berurutan dari `supabase/migrations/`. Di antaranya:

- `20261027000000_role_based_rls.sql`: role, Row Level Security, dan kebijakan akses.
- `20261027000001_enable_orders_realtime.sql` dan `20261027000004_enable_tenant_realtime.sql`: publikasi tabel pesanan dan tenant untuk Realtime.
- `20261027000006_guest_checkout_slug.sql`: slug tenant, token pesanan, kebijakan akses guest, dan broadcast status pesanan.
- `20261027000007_guest_transfer_proofs.sql`: penyimpanan bukti transfer.
- `20261027000009_menu_addons.sql`: konfigurasi add-on.
- `20261028000000_daily_order_queue.sql`: nomor antrean dan counter harian.
- `20261029000000_menu_reviews.sql`: model rating menu versi awal.
- `20261029000001_tenant_reviews.sql`: rating satu kali per pesanan/tenant, RPC submit/aggregasi, serta migrasi rating lama.
- `20261029000003_restore_daily_queue_numbering.sql`: mengembalikan nomor antrean yang terus bertambah per tenant dan tanggal.

Migration adalah perubahan skema yang perlu diterapkan ke proyek Supabase sebelum kode yang bergantung padanya dirilis. Jangan menganggap file migration sudah otomatis diterapkan hanya karena ada di repository.

## 4. Alur Kerja Utama

### Pesanan guest

1. Pengunjung membuka `/`, memilih tenant yang buka, lalu membuka `/tenant/<slug>`.
2. Halaman katalog memuat menu tersedia dan status tenant dari Supabase. Realtime tenant memperbarui badge buka/tutup, pesan penutupan, serta kemampuan checkout tanpa refresh.
3. Pengunjung memilih item dan add-on, mengisi NIM serta nomor WhatsApp, kemudian mengunggah bukti pembayaran QRIS.
4. Browser mengirim checkout ke `create-guest-order`. Function memvalidasi input dan harga berdasarkan database, memanggil `next_tenant_queue_number`, lalu menyimpan pesanan dan detailnya.
5. Token acak menjadi kunci untuk melihat ringkasan pesanan di `/cek-pesanan`. Token diperlakukan sebagai rahasia pemilik pesanan.
6. Tenant memperbarui status melalui dashboard. Pembeli menerima perubahan melalui Realtime; badge status dan stepper diperbarui tanpa refresh.
7. Setelah pesanan `Selesai`, pembeli dapat mengirim satu rating bintang 1–5 untuk tenant. Nilai ini tersimpan pada `tenant_reviews` dan menjadi agregat rating di beranda serta katalog tenant.

### Nomor antrean

Counter antrean dicatat per tenant dan tanggal lokal Asia/Jakarta. Nomor bertambah terus sepanjang hari dan kembali ke `A-01` saat tanggal berganti.

### Dashboard tenant

Saat halaman dashboard siap, aplikasi memeriksa sesi dan role pemilik, memuat tenant, kemudian memuat pesanan dan menu pertama kali. Perubahan pada tabel `orders` memicu pemuatan ulang daftar dan ringkasan; perubahan status buka/tutup tenant memperbarui kontrol operasional. Kartu pesanan menampilkan nomor antrean.

### WhatsApp

Edge Function menghubungi gateway Node.js melalui URL HTTPS (umumnya tunnel ngrok). Gateway memvalidasi API key lalu meminta Baileys mengirim pesan melalui sesi WhatsApp. Gateway tidak menggantikan database: pesanan tetap disimpan walaupun notifikasi gagal.

```text
Browser
  ├── Astro SSR dan halaman
  └── Supabase client browser
        ├── PostgreSQL / RLS / RPC
        ├── Realtime (orders, tenants)
        ├── Storage (bukti transfer)
        └── Edge Functions
              └── create-guest-order
                    ├── database + nomor antrean
                    └── HTTPS tunnel → Node.js Gateway → Baileys → WhatsApp
```

## 5. Alur Demo Presentasi

1. **Beranda:** tunjukkan tenant, badge buka/tutup, rata-rata rating tenant, dan filter “Sedang buka”.
2. **Katalog:** buka salah satu tenant, cari/filter menu, pilih jumlah dan add-on.
3. **Checkout:** jelaskan validasi NIM, nomor WhatsApp, QRIS, dan upload bukti transfer. Jangan gunakan data pribadi nyata untuk demo.
4. **Nomor antrean:** tunjukkan nomor dan token yang muncul setelah pesanan dibuat.
5. **Dashboard tenant:** buka akun pemilik tenant, perlihatkan pesanan dan antrean, lalu ubah statusnya.
6. **Cek pesanan:** masukkan token pada perangkat/tab pembeli. Tunjukkan badge dan stepper bergerak realtime.
7. **Rating:** setelah status pesanan `Selesai`, kirim rating tenant dan jelaskan bahwa agregat ditampilkan di katalog.
8. **Admin:** tunjukkan pengelolaan tenant, akun, dan menu tanpa membuka data rahasia.

## 6. Menjalankan dan Memvalidasi

Jalankan perintah dari folder `sikantin-astro/`:

```powershell
npm install
npm run dev
npm run build
```

Pastikan environment aplikasi memuat `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY`. Jalankan migration yang diperlukan dan deploy Edge Functions ke proyek Supabase sebelum menguji alur penuh. Jangan pernah mengekspos service-role key, `WA_API_KEY`, atau isi sesi Baileys ke browser.

Script gateway yang tersedia pada `sikantin-astro/package.json`:

```powershell
npm run wa:server
npm run wa:tunnel
```

Gunakan tunnel HTTPS hanya untuk menghubungkan Supabase Edge Function dengan gateway lokal saat pengembangan. Jaga gateway tetap terikat ke localhost, dan jangan menjalankan dua proses yang memakai sesi Baileys sama secara bersamaan.

## 7. Poin Belajar

- **Astro routing:** file `.astro` di `src/pages` menjadi halaman; `[slug]` menerima parameter URL.
- **Rendering server dan browser:** query katalog awal dapat dilakukan saat render server, sedangkan event klik dan Realtime dijalankan di browser.
- **Supabase:** PostgreSQL menyimpan data, RLS mengatur siapa yang boleh membaca/menulis, RPC merangkum operasi database, Realtime mengirim perubahan, dan Storage menyimpan file.
- **Validasi server:** browser tidak dipercaya untuk menentukan harga atau status izin. Edge Function memvalidasi detail checkout dari sumber data server.
- **Asinkron:** query Supabase dan Realtime bekerja asinkron. Tampilkan status pemuatan/kegagalan dan lepaskan channel saat halaman ditinggalkan.
- **Migrasi database:** perubahan skema perlu diberi nama, urutan, dan dokumentasi; frontend dan Edge Function harus memakai kontrak skema yang sama.
- **Pemisahan integrasi:** kegagalan WhatsApp tidak seharusnya membatalkan pesanan yang telah tersimpan.

## 8. Catatan Batasan dan Keamanan

- QRIS diimplementasikan sebagai tampilan kode dan unggahan bukti; repository ini tidak menunjukkan payment gateway yang otomatis menyelesaikan pembayaran.
- Token pesanan adalah bearer credential: siapa pun yang memilikinya dapat melihat ringkasan status pesanan tersebut. Jangan membagikannya secara publik.
- Nomor WhatsApp gateway, service-role key, bukti transfer, serta sesi Baileys harus diperlakukan sebagai data sensitif.
- `auth_info_baileys/` dan file environment berisi rahasia tidak boleh ikut dipresentasikan atau di-commit.
- Fitur Realtime memerlukan tabel terdaftar pada publication `supabase_realtime`, kebijakan akses yang sesuai, dan koneksi Supabase yang valid.
- `css/`, `js/`, `index.js`, dan `wa-service.js` pada root dipisahkan dari aplikasi Astro di `sikantin-astro/`; ketika mengubah fitur, pastikan file yang diedit memang jalur aplikasi yang sedang dipakai.

## 9. FAQ Singkat

**Mengapa mahasiswa tidak perlu login?**
Katalog dan checkout guest dibuat agar pemesanan cepat. NIM tetap divalidasi sebelum pesanan diproses.

**Mengapa perlu token untuk mengecek pesanan?**
Token acak mengidentifikasi pesanan guest tanpa membuka daftar pesanan publik.

**Apa yang terjadi jika WhatsApp tidak aktif?**
Pesanan tetap tersimpan; respons checkout melaporkan notifikasi secara terpisah.

**Bagaimana rating ditampilkan?**
Satu rating per order diberikan setelah status `Selesai`. Database mengagregasi nilai tersebut per tenant.

**Kapan nomor antrean kembali ke A-01?**
Ketika semua pesanan dalam siklus antrean tenant pada hari itu berstatus `Selesai` atau `Dibatalkan`.

**Apakah seluruh integrasi siap hanya dengan menjalankan `npm run dev`?**
Tidak. Database harus memiliki migration yang sesuai, Edge Functions harus di-deploy, environment harus benar, dan gateway WhatsApp harus tersedia jika notifikasi WhatsApp ingin diuji.
