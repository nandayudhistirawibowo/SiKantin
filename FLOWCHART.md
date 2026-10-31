# Flowchart SiKantin

Diagram berikut membedakan alur yang tersedia saat ini dari kondisi eksternal yang harus disiapkan (Supabase dan gateway WhatsApp). QRIS adalah proses manual. Verifikasi pembayaran saat ini dilakukan tenant; aksi verifikasi admin belum tersedia di dashboard.

## 1. Guest Flow

```mermaid
flowchart TD
    A[Buka beranda SiKantin] --> B[Pilih tenant yang buka]
    B --> C[Lihat, cari, dan pilih menu]
    C --> D[Atur jumlah dan add-on]
    D --> E[Isi NIM dan nomor HP/WhatsApp]
    E --> F[Unggah bukti transfer QRIS]
    F --> G[Kirim checkout ke Edge Function]
    G --> H{NIM terdaftar, tenant buka, menu dan bukti valid?}
    H -- Tidak --> I[Tampilkan alasan gagal; pembeli memperbaiki input]
    I --> E
    H -- Ya --> J[Server baca harga dan add-on dari database]
    J --> K[Server hitung total dan nomor antrean WIB]
    K --> L[Simpan order dan order_items]
    L --> M[Buat token pelacakan]
    M --> N[Coba kirim konfirmasi melalui gateway WhatsApp]
    N --> O[Tampilkan konfirmasi, token, dan nomor antrean]
    O --> P[Tenant memeriksa bukti QRIS secara manual]
    P --> Q{Bukti sesuai?}
    Q -- Tidak --> R[Tenant menolak/membatalkan dan mencatat alasan]
    Q -- Ya --> S[Tenant memproses pesanan]
    S --> T[Status diperbarui: Siap diambil lalu Selesai]
    R --> U[Pembeli membuka Cek Pesanan dengan token]
    T --> U
    U --> V[Lihat status, antrean, dan rincian order]
    V --> W{Order selesai?}
    W -- Belum --> U
    W -- Ya --> X[Opsional: kirim rating tenant bintang 1-5]
    N -. Gateway gagal: order tetap ditelusuri dengan token .-> O
```

## 2. Mahasiswa Login Flow

```mermaid
flowchart TD
    A[Admin mendaftarkan NIM, nama, dan nomor WhatsApp] --> B[Auth user dibuat dengan password sementara acak]
    B --> C[Kirim NIM dan password sementara melalui WhatsApp]
    C --> D[Mahasiswa login memakai NIM dan password sementara]
    D --> E{Password sementara?}
    E -- Ya --> F[Wajib ganti password melalui Profil]
    F --> G[Masuk ke dashboard mahasiswa]
    E -- Tidak --> G
    G --> H[Tampilkan sapaan, favorit, dan tiga order terbaru]
    H --> I[Pilih tenant dan menu]
    I --> J[Checkout dengan NIM dan nomor HP dari profil]
    J --> K{Profil lengkap dan valid?}
    K -- Tidak --> L[Isi/perbaiki profil]
    L --> J
    K -- Ya --> M[Unggah bukti QRIS dan kirim checkout]
    M --> N[Server validasi dan simpan order, item, token, serta antrean]
    N --> O[Coba kirim notifikasi WhatsApp]
    O --> P[Pantau order via token/realtime]
    P --> Q[Lihat order pada riwayat akun]
    Q --> R{Status Selesai?}
    R -- Tidak --> P
    R -- Ya --> S[Kirim rating tenant]
    O -. Pengiriman tidak tersedia/gagal .-> P
```

> Email `[NIM]@uym.ac.id` hanya dipakai sebagai identitas internal Supabase Auth. Password sementara dikirim melalui WhatsApp, bukan email.

## 3. Tenant Flow

```mermaid
flowchart TD
    A[Pemilik login] --> B[Dashboard memvalidasi sesi, role, dan tenant]
    B --> C[Terima order baru melalui database/Realtime]
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
```

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
    A[Admin login] --> B[Dashboard memvalidasi sesi dan role admin]
    B --> C[Kelola tenant, pemilik, kontak, QRIS, dan jam operasi]
    B --> D[Kelola menu, harga, add-on, foto, dan ketersediaan]
    B --> E[Daftarkan mahasiswa dengan NIM, nama, dan nomor WhatsApp]
    E --> F[Buat Auth user dengan password sementara acak]
    F --> G[Kirim NIM dan password sementara melalui WhatsApp]
    G --> H[Mahasiswa login dan wajib mengganti password melalui Profil]
    B --> I[Pilih mahasiswa dan minta reset password darurat]
    I --> J[Edge Function memvalidasi JWT dan role admin]
    J --> K{Target terdaftar sebagai mahasiswa?}
    K -- Tidak --> L[Tolak permintaan]
    K -- Ya --> M[Set password sementara dan tandai wajib ganti]
    M --> N[Admin menyampaikan instruksi secara aman]
    N --> O[Mahasiswa login dan membuat password baru]
    B -. Verifikasi pembayaran tidak tersedia di dashboard admin .-> O[Verifikasi dilakukan pemilik tenant]
```

## 5. Sequence Checkout dan WhatsApp

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

    Buyer->>Web: Pilih item, isi identitas, unggah bukti
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
    Web-->>Buyer: Nomor pesanan, antrean, dan token
    Note over Buyer,DB: Token menjadi jalur pelacakan jika pesan WhatsApp gagal
```

## 6. Cek Status dan Rating

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
    Buyer->>Web: Kirim rating setelah selesai
    Web->>DB: submit_guest_order_rating(token, rating)
    DB-->>Web: Validasi order selesai dan simpan rating
```
