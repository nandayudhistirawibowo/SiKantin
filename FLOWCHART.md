# Flowchart SiKantin

Diagram menggambarkan alur yang tersedia pada aplikasi saat ini. Cabang QRIS tetap manual; notifikasi WhatsApp tidak menjadi syarat keberhasilan penyimpanan pesanan.

## Mahasiswa (Guest)

```mermaid
flowchart TD
    A[Buka web SiKantin] --> B[Pilih tenant yang buka]
    B --> C[Lihat / cari menu]
    C --> D[Pilih jumlah dan add-on]
    D --> E[Isi NIM dan nomor WhatsApp]
    E --> F[Unggah bukti transfer QRIS]
    F --> G{Input valid dan tenant buka?}
    G -- Tidak --> H[Tampilkan kesalahan; perbaiki checkout]
    H --> E
    G -- Ya --> I[Edge Function validasi harga dan menu]
    I --> J[Simpan order dan order_items]
    J --> K[Alokasikan nomor antrean dan token]
    K --> L[Coba kirim notifikasi melalui gateway WhatsApp]
    L --> M[Tampilkan konfirmasi dan token]
    M --> N[Periksa QRIS secara manual oleh tenant]
    N --> O[Tenant memperbarui status pesanan]
    O --> P[Mahasiswa buka Cek Pesanan dengan token]
    P --> Q{Status pesanan selesai?}
    Q -- Belum --> P
    Q -- Ya --> R[Opsional: beri rating tenant]
```

## Mahasiswa (Login)

```mermaid
flowchart TD
    A[Login dengan NIM dan password] --> B[Validasi akun dan role mahasiswa]
    B --> C[Buka dashboard mahasiswa]
    C --> D[Pilih tenant dan menu]
    D --> E[Checkout; data profil/NIM/telepon diisi otomatis bila tersedia]
    E --> F[Konfirmasi item dan unggah bukti QRIS]
    F --> G{Tenant buka dan checkout valid?}
    G -- Tidak --> H[Tampilkan pesan; kembali ke katalog]
    H --> D
    G -- Ya --> I[Edge Function simpan order, item, nomor antrean, dan token]
    I --> J[Coba kirim notifikasi WhatsApp]
    J --> K[Pelacakan status realtime / Cek Pesanan]
    K --> L{Pesanan selesai?}
    L -- Tidak --> K
    L -- Ya --> M[Kirim rating tenant]
    M --> N[Rating tampil pada agregat tenant]
```

## Tenant

```mermaid
flowchart TD
    A[Login pemilik tenant] --> B[Dashboard memeriksa sesi, role, dan kepemilikan]
    B --> C[Terima pesanan baru melalui Realtime]
    C --> D{Pembayaran QRIS?}
    D -- Ya --> E[Periksa bukti transfer secara manual]
    D -- Tidak --> F[Periksa detail pesanan]
    E --> G{Pembayaran sesuai?}
    G -- Tidak --> H[Tolak pesanan dan isi alasan]
    G -- Ya --> I[Ubah status: Diproses]
    F --> I
    I --> J[Siapkan pesanan]
    J --> K[Ubah status: Siap diambil]
    K --> L[Pesanan diambil]
    L --> M[Ubah status: Selesai]
    H --> N[Status database/realtime diperbarui]
    M --> N
    N --> O[Notifikasi WhatsApp dicoba sesuai status/integrasi]
```

### Status operasional tenant

```mermaid
flowchart TD
    A[Admin menetapkan jam_buka dan jam_tutup WIB] --> B[pg_cron berjalan setiap menit]
    B --> C{override_until masih di masa depan?}
    C -- Ya --> D[Pertahankan status manual]
    C -- Tidak --> E[Hitung status menurut jadwal Asia/Jakarta]
    E --> F[Perbarui status_buka dan hapus override yang kedaluwarsa]
    G[Tenant menekan Buka/Tutup Manual] --> H[RPC memverifikasi pemilik tenant]
    H --> I[Simpan status dan batas jadwal berikutnya pada override_until]
    I --> B
```

## Admin

```mermaid
flowchart TD
    A[Login admin] --> B[Validasi sesi dan role admin]
    B --> C[Kelola mahasiswa dan pemilik tenant]
    B --> D[Tambah / ubah tenant, jam operasional, dan QRIS]
    B --> E[Tambah / ubah menu, harga, ketersediaan, dan add-on]
    B --> F[Melihat ringkasan data yang tersedia]
    D --> G[Jadwal otomatis digunakan scheduler]
    H[Verifikasi bukti pembayaran] -. Pada aplikasi saat ini .-> I[Dilakukan oleh pemilik tenant, bukan dashboard admin]
```

## Batas Integrasi WhatsApp

```mermaid
sequenceDiagram
    participant Web as Browser
    participant EF as Supabase Edge Function
    participant DB as PostgreSQL
    participant GW as Gateway Node.js
    participant WA as WhatsApp via Baileys

    Web->>EF: Checkout dengan data pesanan dan bukti QRIS
    EF->>DB: Validasi dan simpan order serta detail
    DB-->>EF: Order tersimpan + token + antrean
    EF->>GW: Coba kirim pesan melalui HTTPS
    GW->>WA: Kirim menggunakan sesi gateway
    WA-->>GW: Hasil pengiriman
    GW-->>EF: Hasil berhasil/gagal
    EF-->>Web: Konfirmasi order; status notifikasi terpisah
```
