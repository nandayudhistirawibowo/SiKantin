# Flowchart SiKantin

Diagram berikut membedakan alur yang tersedia saat ini dari kondisi eksternal yang harus disiapkan (Supabase dan gateway WhatsApp). QRIS adalah proses manual. Verifikasi pembayaran saat ini dilakukan tenant; aksi verifikasi admin belum tersedia di dashboard.

## 1. Guest Flow

```mermaid
flowchart TD
    A[Buka beranda SiKantin] --> B[Pilih tenant yang buka]
    B --> C[Lihat, cari, dan pilih menu]
    C --> D[Atur jumlah dan add-on di katalog]
    D --> E[Simpan keranjang dan asal tenant di sessionStorage]
    E --> F[Klik Lanjut ke Checkout]
    F --> G[Halaman /checkout memulihkan ringkasan keranjang]
    G --> H[Isi NIM dan nomor HP/WhatsApp]
    H --> I[Unggah bukti transfer QRIS]
    I --> J[Kirim checkout ke Edge Function]
    J --> K{NIM terdaftar, tenant buka, menu dan bukti valid?}
    K -- Tidak --> L[Tampilkan alasan gagal; perbaiki input di checkout]
    L --> H
    K -- Ya --> M[Server baca harga dan add-on dari database]
    M --> N[Server hitung total dan nomor antrean WIB]
    N --> O[Simpan order dan order_items]
    O --> P[Buat token pelacakan]
    P --> Q[Coba kirim notifikasi melalui gateway WhatsApp]
    Q --> R[Alihkan ke /cek-pesanan?token=...]
    R --> S[Tenant memeriksa bukti QRIS secara manual]
    S --> T{Bukti sesuai?}
    T -- Tidak --> U[Tenant menolak order dan mencatat alasan]
    T -- Ya --> V[Tenant memproses pesanan]
    V --> W[Status diperbarui: Siap diambil lalu Selesai]
    U --> X[Pembeli melacak order dengan token]
    W --> X
    X --> Y[Lihat status, antrean, dan rincian order]
    Y --> Z{Order selesai?}
    Z -- Belum --> X
    Z -- Ya --> AA[Opsional: kirim rating dan saran/masukan]
    AA --> AB[Riwayat tenant menampilkan rating, feedback, dan waktu selesai]
    AB --> AC{Asal pembeli}
    AC -- Guest --> AD[Kembali ke beranda]
    AC -- Dashboard mahasiswa --> AE[Kembali ke dashboard mahasiswa]
    Q -. Gateway gagal: token dan cek pesanan tetap tersedia .-> R
```

## 2. Mahasiswa Login Flow

```mermaid
flowchart TD
    A[Admin mendaftarkan NIM dan nama] --> B[Auth user dibuat dengan password awal sama dengan NIM]
    B --> C[Mahasiswa login memakai NIM dan password]
    C --> D{Metadata is_temp_password aktif?}
    D -- Ya --> E[Login mengarahkan mahasiswa ke Profil]
    E --> F[Ganti password dengan Supabase Auth updateUser]
    F --> G[Masuk ke /mahasiswa/dashboard]
    D -- Tidak --> G
    H[Admin reset password mahasiswa] --> I[Edge Function cek JWT, role admin, dan NIM target]
    I --> J[Set password menjadi NIM dan aktifkan is_temp_password]
    J --> C
    G --> K[Tampilkan sapaan, favorit, dan tiga order terbaru]
    K --> L[Pilih kantin dari /#daftar-tenant atau daftar dashboard]
    L --> M[Pilih menu, jumlah, dan add-on]
    M --> N[Simpan keranjang; asal dicatat sebagai /mahasiswa/dashboard]
    N --> O[Checkout terpisah di /checkout]
    O --> P[Profil lengkap?]
    P -- Tidak --> Q[Isi/perbaiki profil]
    Q --> O
    P -- Ya --> R[Unggah bukti QRIS dan kirim checkout]
    R --> S[Server validasi dan simpan order, item, token, serta antrean]
    S --> T[Coba kirim notifikasi WhatsApp]
    T --> U[Pantau order via /cek-pesanan dan token]
    U --> V[Lihat order pada riwayat akun]
    V --> W{Status Selesai?}
    W -- Tidak --> U
    W -- Ya --> X[Kirim rating dan saran opsional ke tenant_reviews]
    X --> Y[Redirect selesai kembali ke dashboard mahasiswa]
    T -. Pengiriman tidak tersedia/gagal .-> U
```

> Email `[NIM]@uym.ac.id` hanya dipakai sebagai identitas internal Supabase Auth. Registrasi tidak mengirim email atau WhatsApp.

## 3. Tenant Flow

```mermaid
flowchart TD
    A[Pemilik login] --> B[Login memvalidasi sesi, role, dan tenant]
    B --> B1[Redirect ke /tenant-dashboard]
    B1 --> C[Terima order baru melalui database/Realtime]
    C --> D[Lihat antrean, rincian, dan bukti QRIS]
    D --> E{Pembayaran terverifikasi manual?}
    E -- Tidak --> F[Tolak order dan isi alasan]
    E -- Ya --> G[Klik Verifikasi Pembayaran]
    G --> H[Status menjadi Diproses]
    H --> I[Siapkan menu]
    I --> J[Ubah status menjadi Siap diambil]
    J --> K[Pembeli mengambil order]
    K --> L[Ubah status menjadi Selesai]
    F --> M[Status dan alasan disimpan]
    L --> M
    M --> N[Coba kirim notifikasi WhatsApp sesuai integrasi]
    M --> O[Pembeli melihat status pada halaman cek order]
    L --> R[Riwayat tenant menampilkan detail order selesai dan feedback]
    R --> S[Perubahan tenant_reviews menyegarkan riwayat via Realtime]
    P[Tab dashboard tenant lain menerima event INSERT/UPDATE/DELETE dengan filter tenant_id] --> Q[Muat ulang order dan hitung statistik]
    M --> P
```

Ringkasan pendapatan dan jumlah order pada dashboard tenant dapat difilter berdasarkan Hari Ini, 7 Hari Terakhir, atau Bulan Ini menggunakan tanggal `created_at` WIB. Pendapatan mengecualikan pesanan dibatalkan.

### Buka/tutup tenant

```mermaid
flowchart TD
    A[Admin menyimpan jam_buka dan jam_tutup WIB] --> B[pg_cron berjalan setiap menit]
    B --> C{override_until masih aktif?}
    C -- Ya --> D[Pertahankan status manual tenant]
    C -- Tidak --> E[Hitung status menurut waktu Asia/Jakarta]
    E --> F[Update status_buka dan bersihkan override kedaluwarsa]
    G[Tenant menekan Buka/Tutup Manual] --> H[RPC memverifikasi pemilik tenant]
    H --> I[Simpan status_buka dan batas jadwal berikutnya]
    I --> B
```

## 4. Admin Flow

```mermaid
flowchart TD
    A[Admin login] --> B[Login memvalidasi sesi dan role admin]
    B --> B1[Redirect ke /admin/dashboard]
    B1 --> C[Kelola tenant, pemilik, kontak, QRIS, dan jam operasi]
    B1 --> D[Kelola menu, harga, add-on, foto, dan ketersediaan]
    B1 --> E[Daftarkan mahasiswa dengan NIM dan nama tanpa WA]
    E --> F[Buat Auth user dengan password sama dengan NIM]
    F --> G[Mahasiswa login; akun diarahkan ke Profil untuk mengganti password]
    B1 --> H[Pilih mahasiswa dan tekan Reset Password]
    H --> I[Edge Function memvalidasi JWT dan role admin]
    I --> J{Target terdaftar sebagai mahasiswa dengan NIM valid?}
    J -- Tidak --> K[Tolak permintaan]
    J -- Ya --> L[Set password menjadi NIM dan aktifkan is_temp_password]
    L --> M[Mahasiswa login dan mengganti password melalui Profil]
    B1 -. Verifikasi pembayaran tidak tersedia di dashboard admin .-> N[Verifikasi dilakukan pemilik tenant]
```

## 5. Checkout Terpisah dan Navigasi Sesi

```mermaid
flowchart LR
    A[Katalog tenant] -->|Pilih menu dan add-on| B[Keranjang sessionStorage]
    B -->|Lanjut ke Checkout| C[Halaman Checkout dengan slug tenant]
    C -->|Simpan referrer tenant| D[Submit order]
    D --> E[Halaman Cek Pesanan dengan token]
    E -->|Selesaikan Pesanan| F{referrer aman dan tersedia?}
    F -- Guest --> G[Kembali ke beranda]
    F -- Dashboard mahasiswa --> H[Kembali ke dashboard mahasiswa]
    F -- Kosong atau tidak dikenal --> I[Kembali ke beranda]
```

## 6. Sequence Checkout dan WhatsApp

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Guest/Mahasiswa
    participant Web as Astro Web
    participant EF as Supabase Edge Function
    participant DB as Supabase PostgreSQL
    participant Storage as Supabase Storage
    participant Gateway as Gateway WhatsApp
    participant WA as WhatsApp/Baileys

    Buyer->>Web: Pilih item, jumlah, dan add-on di katalog tenant
    Web->>Web: Simpan cart dan tenant sebagai asal di sessionStorage
    Buyer->>Web: Lanjut ke halaman /checkout
    Web-->>Buyer: Tampilkan ringkasan cart; identitas dan pembayaran
    Buyer->>Web: Isi identitas dan unggah bukti QRIS
    Web->>EF: Checkout multipart/form-data
    EF->>DB: Validasi NIM, tenant, menu, harga, add-on
    DB-->>EF: Data tervalidasi
    EF->>Storage: Simpan bukti transfer
    EF->>DB: Alokasikan nomor antrean per tenant/tanggal WIB
    EF->>DB: Simpan order dan order_items
    DB-->>EF: Order, token, total, antrean
    EF->>Gateway: Coba kirim notifikasi order
    Gateway->>WA: Kirim pesan menggunakan sesi gateway
    WA-->>Gateway: Hasil kirim atau gagal
    Gateway-->>EF: Hasil notifikasi
    EF-->>Web: Konfirmasi order dan token
    Web->>Web: Simpan asal untuk redirect dan bersihkan cart
    Web-->>Buyer: Redirect ke /cek-pesanan?token=...
    Note over Buyer,DB: Token menjadi jalur pelacakan jika pesan WhatsApp gagal
```

Saat tenant menolak order, `notify-order-rejected` mencoba mengirim alasan penolakan ke `orders.phone`. Formatnya: `Mohon maaf, pesanan Anda [Nomor Pesanan] di [Nama Tenant] ditolak. Alasan: [Alasan]. Silakan pesan menu lain.` Pengiriman ini tidak mengubah status transaksi database atau mengubah gateway/Baileys.

## 7. Cek Status dan Rating

```mermaid
sequenceDiagram
    actor Buyer as Pembeli
    participant Web as Halaman Cek Pesanan
    participant DB as RPC Supabase
    participant Tenant as Dashboard Tenant

    Buyer->>Web: Masukkan token
    Web->>DB: lookup_guest_order_with_queue(token)
    DB-->>Web: Ringkasan order dan item
    Web-->>Buyer: Status, antrean, total, dan rincian
    Tenant->>DB: Perbarui status order
    DB-->>Web: Realtime status update
    Web-->>Buyer: Render status terbaru
    Buyer->>Web: Kirim rating dan feedback opsional setelah selesai
    Web->>DB: submit_guest_order_rating(token, rating, feedback_text)
    DB-->>Web: Validasi order selesai dan simpan rating/feedback
    DB-->>Tenant: Realtime tenant_reviews
    Tenant->>DB: Muat ulang riwayat pesanan selesai
    Web->>Web: Redirect ke beranda (guest) atau dashboard mahasiswa
```
