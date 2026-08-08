# PRD — ACTiV Quotation Sales Portal

## 1. Overview

**Nama Produk:** ACTiV Sales Portal  
**Tipe Aplikasi:** Web-based Single Page Application (SPA) – Internal Sales Tool  
**Tujuan:** Sistem terpadu untuk manajemen penawaran harga (Quotation), pelanggan, produk, dan kinerja tim sales PT. Alfa Cipta Teknologi Virtual (ACTiV).

---

## 2. User Roles

| Role                     | Akses                                                        |
| ------------------------ | ------------------------------------------------------------ |
| **Sales Manager**        | Full access: semua quotation, analytics, settings, tim sales |
| **Account Executive**    | Akses quotation milik sendiri, customers, products           |
| **Sales Representative** | Akses quotation milik sendiri, customers, products           |

> [!NOTE]
> Saat ini autentikasi hanya berdasarkan email (tanpa password enforcement). Untuk production, harus ditambahkan hashing dan JWT.

---

## 3. Modul & Fitur

| Modul            | Fitur                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| **Auth / Login** | Login dengan email + password, quick-select akun demo, session via localStorage    |
| **Dashboard**    | KPI ringkasan, chart revenue bulanan, daftar quotation terbaru, performa per sales |
| **Quotations**   | Buat / edit / hapus / duplikat quotation, filter status & search, print PDF        |
| **Customers**    | CRUD pelanggan + multi-PIC, riwayat transaksi                                      |
| **Products**     | CRUD produk per brand, upload gambar produk                                        |
| **Brands**       | Manajemen brand/kategori produk                                                    |
| **Analytics**    | Chart revenue, win-rate, performa per sales, top customer & brand                  |
| **Settings**     | Info perusahaan, rekening bank, manajemen tim sales (tambah/hapus)                 |
| **Profile**      | Edit info akun login, upload foto profil, upload tanda tangan digital              |

---

## 4. Flow Diagram

### 4.1 Authentication Flow

```mermaid
flowchart TD
    A([User buka aplikasi]) --> B{Session aktif?}
    B -- Ya --> C[Redirect ke Dashboard]
    B -- Tidak --> D[Tampilkan Halaman Login]
    D --> E[Input Email & Password]
    E --> F{Email terdaftar di SALES_TEAM?}
    F -- Tidak --> G[Tampilkan error toast]
    G --> D
    F -- Ya --> H[Simpan user ke localStorage]
    H --> C
    C --> I{User klik Logout?}
    I -- Ya --> J[Hapus session localStorage]
    J --> D
    I -- Tidak --> C
```

### 4.2 Quotation Creation Flow

```mermaid
flowchart TD
    A([Sales klik 'Buat Quotation']) --> B[Modal: Pilih / Buat Customer Baru]
    B --> C{Customer baru?}
    C -- Ya --> D[Input nama PT + daftar PIC]
    C -- Tidak --> E[Pilih dari dropdown customer yang ada]
    D --> F[Input info Quotation: Sales, Masa Berlaku]
    E --> F
    F --> G[Klik 'Lanjut & Isi Produk']
    G --> H[Halaman Edit Quotation]
    H --> I[Tambah item produk: SKU, Qty, Harga, Margin]
    I --> J{Item mencukupi?}
    J -- Belum --> I
    J -- Sudah --> K[Set Status, PPN, Rekening Bank]
    K --> L[Simpan Quotation]
    L --> M{Print PDF?}
    M -- Ya --> N[Render HTML Print + Tanda Tangan]
    N --> O([PDF dicetak / disimpan])
    M -- Tidak --> P([Kembali ke list Quotation])
```

### 4.3 Quotation Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft : Quotation dibuat
    Draft --> Sent : Sales kirim ke customer
    Sent --> Approved : Customer menyetujui
    Sent --> Rejected : Customer menolak
    Sent --> Expired : Melewati tanggal expiry
    Draft --> Expired : Melewati tanggal expiry
    Approved --> [*]
    Rejected --> Draft : Sales revisi ulang
    Expired --> Draft : Sales buat ulang
```

### 4.4 Customer & PIC Management Flow

```mermaid
flowchart LR
    A([Sales buka menu Customers]) --> B[List semua Customer]
    B --> C{Aksi}
    C -- Tambah --> D[Form: Nama PT + PIC pertama]
    C -- Edit --> E[Form edit data Customer + kelola daftar PIC]
    C -- Hapus --> F{Konfirmasi hapus}
    D --> G[Simpan Customer baru]
    E --> H{Aksi PIC}
    H -- Tambah PIC --> I[Form: Nama, No HP, Email PIC]
    H -- Set PIC utama --> J[Update primary PIC]
    H -- Hapus PIC --> K[Hapus dari daftar PIC]
    G --> B
    F -- Ya --> L[Hapus Customer]
    L --> B
```

### 4.5 Profile & Signature Flow

```mermaid
flowchart TD
    A([User klik avatar di Sidebar]) --> B[Halaman Profil]
    B --> C[Edit Nama / Email / Mobile]
    B --> D[Klik area avatar]
    D --> E[Upload file gambar JPG/PNG]
    E --> F[Preview avatar baru]
    B --> G[Upload file tanda tangan PNG]
    G --> H[Preview tanda tangan]
    C & F & H --> I[Klik 'Simpan Perubahan']
    I --> J[Update localStorage + SALES_TEAM in-memory]
    J --> K[Re-render Sidebar dengan avatar baru]
    K --> L([Tanda tangan tampil otomatis di PDF Quotation])
```

---

## 5. Database Schema

> [!IMPORTANT]
> Saat ini semua data disimpan **in-memory** di `data.js` + **localStorage** untuk sesi & profil. Schema berikut adalah rancangan untuk migrasi ke database relasional (PostgreSQL / MySQL).

---

### Tabel `users` (Tim Sales)

| Kolom             | Tipe         | Constraint       | Keterangan                                               |
| ----------------- | ------------ | ---------------- | -------------------------------------------------------- |
| `id`              | VARCHAR(10)  | PK               | Contoh: `S001`                                           |
| `name`            | VARCHAR(100) | NOT NULL         | Nama lengkap                                             |
| `role`            | VARCHAR(50)  | NOT NULL         | Sales Manager / Account Executive / Sales Representative |
| `email`           | VARCHAR(100) | UNIQUE, NOT NULL | Email login                                              |
| `password_hash`   | VARCHAR(255) | NOT NULL         | Bcrypt hash                                              |
| `mobile`          | VARCHAR(20)  |                  | Nomor HP                                                 |
| `avatar_initials` | VARCHAR(5)   |                  | Inisial nama (2 huruf)                                   |
| `avatar_img`      | TEXT         | NULLABLE         | Base64 / URL foto profil                                 |
| `signature_img`   | TEXT         | NULLABLE         | Base64 / URL tanda tangan                                |
| `target_sales`    | BIGINT       | DEFAULT 0        | Target penjualan (IDR)                                   |
| `achieved_sales`  | BIGINT       | DEFAULT 0        | Total penjualan tercapai                                 |
| `is_active`       | BOOLEAN      | DEFAULT true     | Status aktif/nonaktif                                    |
| `created_at`      | TIMESTAMP    | DEFAULT NOW()    |                                                          |
| `updated_at`      | TIMESTAMP    |                  |                                                          |

---

### Tabel `customers`

| Kolom         | Tipe         | Constraint    | Keterangan            |
| ------------- | ------------ | ------------- | --------------------- |
| `id`          | VARCHAR(10)  | PK            | Contoh: `C001`        |
| `name`        | VARCHAR(150) | NOT NULL      | Nama perusahaan / PT  |
| `total_spend` | BIGINT       | DEFAULT 0     | Total nilai transaksi |
| `created_at`  | TIMESTAMP    | DEFAULT NOW() |                       |
| `updated_at`  | TIMESTAMP    |               |                       |

---

### Tabel `customer_pics` (Person in Charge)

| Kolom         | Tipe         | Constraint        | Keterangan |
| ------------- | ------------ | ----------------- | ---------- |
| `id`          | SERIAL       | PK                |            |
| `customer_id` | VARCHAR(10)  | FK → customers.id |            |
| `name`        | VARCHAR(100) | NOT NULL          | Nama PIC   |
| `phone`       | VARCHAR(30)  |                   | Nomor HP   |
| `email`       | VARCHAR(100) |                   | Email PIC  |
| `is_primary`  | BOOLEAN      | DEFAULT false     | PIC utama  |
| `created_at`  | TIMESTAMP    | DEFAULT NOW()     |            |

---

### Tabel `brands`

| Kolom        | Tipe         | Constraint       | Keterangan        |
| ------------ | ------------ | ---------------- | ----------------- |
| `id`         | SERIAL       | PK               |                   |
| `name`       | VARCHAR(100) | UNIQUE, NOT NULL | Nama brand        |
| `color_hex`  | VARCHAR(10)  |                  | Warna badge brand |
| `created_at` | TIMESTAMP    | DEFAULT NOW()    |                   |

---

### Tabel `products`

| Kolom         | Tipe         | Constraint     | Keterangan         |
| ------------- | ------------ | -------------- | ------------------ |
| `sku`         | VARCHAR(30)  | PK             | Kode produk unik   |
| `brand_id`    | INT          | FK → brands.id |                    |
| `name`        | VARCHAR(200) | NOT NULL       | Nama produk        |
| `description` | TEXT         |                | Deskripsi panjang  |
| `price`       | BIGINT       | NOT NULL       | Harga satuan (IDR) |
| `image_url`   | TEXT         | NULLABLE       | URL gambar produk  |
| `is_active`   | BOOLEAN      | DEFAULT true   |                    |
| `created_at`  | TIMESTAMP    | DEFAULT NOW()  |                    |
| `updated_at`  | TIMESTAMP    |                |                    |

---

### Tabel `quotations`

| Kolom             | Tipe         | Constraint            | Keterangan                                         |
| ----------------- | ------------ | --------------------- | -------------------------------------------------- |
| `id`              | VARCHAR(20)  | PK                    | Format: `QO5.0726.036`                             |
| `customer_id`     | VARCHAR(10)  | FK → customers.id     |                                                    |
| `pic_id`          | INT          | FK → customer_pics.id | PIC terpilih untuk QO ini                          |
| `sales_id`        | VARCHAR(10)  | FK → users.id         | Sales pembuat                                      |
| `bank_account_id` | VARCHAR(20)  | FK → bank_accounts.id | Rekening tujuan                                    |
| `status`          | ENUM         | NOT NULL              | `draft`, `sent`, `approved`, `rejected`, `expired` |
| `date`            | DATE         | NOT NULL              | Tanggal dibuat                                     |
| `expired`         | DATE         | NOT NULL              | Tanggal kedaluwarsa                                |
| `calc_tax`        | BOOLEAN      | DEFAULT true          | Apakah harga sudah termasuk PPN                    |
| `show_tax`        | BOOLEAN      | DEFAULT true          | Tampilkan baris PPN di PDF                         |
| `ppn_rate`        | DECIMAL(5,4) | DEFAULT 0.11          | Tarif PPN (11%)                                    |
| `notes`           | TEXT         | NULLABLE              | Catatan internal                                   |
| `created_at`      | TIMESTAMP    | DEFAULT NOW()         |                                                    |
| `updated_at`      | TIMESTAMP    |                       |                                                    |

---

### Tabel `quotation_items`

| Kolom          | Tipe         | Constraint         | Keterangan                             |
| -------------- | ------------ | ------------------ | -------------------------------------- |
| `id`           | SERIAL       | PK                 |                                        |
| `quotation_id` | VARCHAR(20)  | FK → quotations.id |                                        |
| `sku`          | VARCHAR(30)  | FK → products.sku  |                                        |
| `qty`          | INT          | NOT NULL           | Jumlah unit                            |
| `price`        | BIGINT       | NOT NULL           | Harga saat quotation dibuat (snapshot) |
| `margin`       | DECIMAL(5,2) | NULLABLE           | Margin % jika ada                      |
| `sort_order`   | INT          | DEFAULT 0          | Urutan tampil                          |

---

### Tabel `quotation_terms`

| Kolom          | Tipe        | Constraint         | Keterangan              |
| -------------- | ----------- | ------------------ | ----------------------- |
| `id`           | SERIAL      | PK                 |                         |
| `quotation_id` | VARCHAR(20) | FK → quotations.id |                         |
| `term_text`    | TEXT        | NOT NULL           | Teks syarat & ketentuan |
| `sort_order`   | INT         | DEFAULT 0          | Urutan tampil           |

---

### Tabel `company`

| Kolom            | Tipe         | Constraint | Keterangan           |
| ---------------- | ------------ | ---------- | -------------------- |
| `id`             | SERIAL       | PK         |                      |
| `name`           | VARCHAR(200) | NOT NULL   | Nama PT              |
| `brand`          | VARCHAR(50)  |            | Nama brand singkat   |
| `address_hq`     | TEXT         |            | Alamat kantor pusat  |
| `address_branch` | TEXT         |            | Alamat kantor cabang |
| `phone`          | VARCHAR(30)  |            |                      |
| `email`          | VARCHAR(100) |            |                      |
| `website`        | VARCHAR(100) |            |                      |
| `logo_url`       | TEXT         | NULLABLE   | URL logo perusahaan  |
| `updated_at`     | TIMESTAMP    |            |                      |

---

### Tabel `bank_accounts`

| Kolom            | Tipe         | Constraint      | Keterangan       |
| ---------------- | ------------ | --------------- | ---------------- |
| `id`             | VARCHAR(20)  | PK              | Contoh: `bca-1`  |
| `company_id`     | INT          | FK → company.id |                  |
| `bank_name`      | VARCHAR(50)  | NOT NULL        | Nama bank        |
| `account_number` | VARCHAR(50)  | NOT NULL        | Nomor rekening   |
| `account_name`   | VARCHAR(200) | NOT NULL        | Atas nama        |
| `is_default`     | BOOLEAN      | DEFAULT false   | Rekening default |
| `created_at`     | TIMESTAMP    | DEFAULT NOW()   |                  |

---

## 6. Entity Relationship (ERD)

```mermaid
erDiagram
    COMPANY ||--o{ BANK_ACCOUNTS : "memiliki"
    USERS }o--|| COMPANY : "bekerja di"
    CUSTOMERS ||--o{ CUSTOMER_PICS : "memiliki"
    CUSTOMERS ||--o{ QUOTATIONS : "menerima"
    USERS ||--o{ QUOTATIONS : "membuat"
    CUSTOMER_PICS }o--|| QUOTATIONS : "menjadi PIC di"
    BANK_ACCOUNTS }o--|| QUOTATIONS : "digunakan di"
    QUOTATIONS ||--o{ QUOTATION_ITEMS : "berisi"
    QUOTATIONS ||--o{ QUOTATION_TERMS : "dilengkapi"
    PRODUCTS }o--|| QUOTATION_ITEMS : "direferensikan"
    BRANDS ||--o{ PRODUCTS : "mengklasifikasikan"

    USERS {
        string id PK
        string name
        string role
        string email
        string password_hash
        string mobile
        text avatar_img
        text signature_img
        bigint target_sales
        boolean is_active
    }

    CUSTOMERS {
        string id PK
        string name
        bigint total_spend
    }

    CUSTOMER_PICS {
        int id PK
        string customer_id FK
        string name
        string phone
        string email
        boolean is_primary
    }

    QUOTATIONS {
        string id PK
        string customer_id FK
        int pic_id FK
        string sales_id FK
        string bank_account_id FK
        enum status
        date date
        date expired
        decimal ppn_rate
        boolean show_tax
    }

    QUOTATION_ITEMS {
        int id PK
        string quotation_id FK
        string sku FK
        int qty
        bigint price
        decimal margin
    }

    PRODUCTS {
        string sku PK
        int brand_id FK
        string name
        text description
        bigint price
        text image_url
    }

    BRANDS {
        int id PK
        string name
        string color_hex
    }

    BANK_ACCOUNTS {
        string id PK
        int company_id FK
        string bank_name
        string account_number
        boolean is_default
    }
```

---

## 7. Rekomendasi Stack untuk Production

| Layer                | Teknologi yang Direkomendasikan                       |
| -------------------- | ----------------------------------------------------- |
| **Frontend**         | Vite + React atau Vue 3 (migrasi dari vanilla JS)     |
| **Backend API**      | Node.js (Express) atau Go (Fiber)                     |
| **Database**         | PostgreSQL                                            |
| **Auth**             | JWT + Refresh Token + bcrypt                          |
| **Storage (Gambar)** | Cloudinary atau AWS S3 (gantikan Base64 localStorage) |
| **PDF Generation**   | Puppeteer (server-side) atau React-PDF                |
| **Hosting**          | Vercel (FE) + Railway / Render (BE)                   |

---

_Dokumen ini dihasilkan berdasarkan analisa codebase ACTiV Quotation Portal versi mockup per Agustus 2026._
