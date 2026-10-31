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
    A[Admin mendaftarkan NIM dan nama] --> B[Auth user dibuat dengan password sama dengan NIM]
    B --> C[Mahasiswa login memakai NIM dan password NIM]
    C --> D{Metadata is_temp_password aktif?}
    D -- Ya --> E[Login mengarahkan mahasiswa ke Profil]
    E --> F[Ganti password dengan Supabase Auth updateUser]
    F --> G[Masuk ke dashboard mahasiswa]
    D -- Tidak --> G
    H[Admin reset password mahasiswa] --> I[Edge Function cek JWT, role admin, dan NIM target]
    I --> J[Set password menjadi NIM dan aktifkan is_temp_password]
    J --> C
    G --> K[Tampilkan sapaan, favorit, dan tiga order terbaru]
    K --> L[Pilih tenant dan menu]
    L --> M[Checkout dengan NIM dan nomor HP dari profil]
    M --> N{Profil lengkap dan valid?}
    N -- Tidak --> O[Isi/perbaiki profil]
    O --> M
    N -- Ya --> P[Unggah bukti QRIS dan kirim checkout]
    P --> Q[Server validasi dan simpan order, item, token, serta antrean]
    Q --> R[Coba kirim notifikasi WhatsApp]
    R --> S[Pantau order via token/realtime]
    S --> T[Lihat order pada riwayat akun]
    T --> U{Status Selesai?}
    U -- Tidak --> S
    U -- Ya --> V[Kirim rating tenant]
    R -. Pengiriman tidak tersedia/gagal .-> S
```

> Email `[NIM]@uym.ac.id` hanya dipakai sebagai identitas internal Supabase Auth. Registrasi tidak mengirim email atau WhatsApp.

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
    P[Tab dashboard tenant lain menerima event INSERT/UPDATE/DELETE dengan filter tenant_id] --> Q[Muat ulang order dan hitung statistik]
    M --> P
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
    B --> E[Daftarkan mahasiswa dengan NIM dan nama tanpa WA]
    E --> F[Buat Auth user dengan password sama dengan NIM]
    F --> G[Mahasiswa login; akun diarahkan ke Profil untuk mengganti password]
    B --> H[Pilih mahasiswa dan tekan Reset Password]
    H --> I[Edge Function memvalidasi JWT dan role admin]
    I --> J{Target terdaftar sebagai mahasiswa dengan NIM valid?}
    J -- Tidak --> K[Tolak permintaan]
    J -- Ya --> L[Set password menjadi NIM dan aktifkan is_temp_password]
    L --> M[Mahasiswa login dan mengganti password melalui Profil]
    B -. Verifikasi pembayaran tidak tersedia di dashboard admin .-> N[Verifikasi dilakukan pemilik tenant]
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

Saat tenant menolak order, `notify-order-rejected` mencoba mengirim alasan penolakan ke `orders.phone`. Formatnya: `Mohon maaf, pesanan Anda [Nomor Pesanan] di [Nama Tenant] ditolak. Alasan: [Alasan]. Silakan pesan menu lain.` Pengiriman ini tidak mengubah status transaksi database atau mengubah gateway/Baileys.

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
