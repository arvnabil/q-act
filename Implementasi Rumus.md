# Walkthrough: Implementasi Rumus Margin Sales

## Ringkasan Perubahan

Perubahan ini mengubah sistem perhitungan harga dari **Markup** menjadi **Margin Sales**, serta menambahkan kalkulasi otomatis modal dari variabel distributor.

---

## Rumus Baru

| Field                 | Rumus                                     | Keterangan                                    |
| --------------------- | ----------------------------------------- | --------------------------------------------- |
| **Harga Modal (HPP)** | `Pricelist Distributor × (1 - Diskon%)`   | Auto-calculated                               |
| **Harga Jual**        | `Modal ÷ (1 - Margin Sales%)`             | Auto-calculated                               |
| **Margin Sales %**    | `(Harga Jual - Modal) / Harga Jual × 100` | Back-calculated saat harga jual diubah manual |

> [!IMPORTANT]
> **Perbedaan utama dengan rumus lama:**
>
> - Lama (Markup): `Harga Jual = Modal × (1 + Markup%)` dan `Markup = (Price - Modal) / Modal`
> - Baru (Margin Sales): `Harga Jual = Modal / (1 - Margin%)` dan `Margin = (Price - Modal) / Price`
>
> **Contoh nyata:** Modal = Rp 800.000, Margin 25%
>
> - Markup lama → Harga Jual = 800.000 × 1.25 = **Rp 1.000.000** (margin hanya 20% dari harga jual)
> - Margin Sales baru → Harga Jual = 800.000 / 0.75 = **Rp 1.066.667** (margin benar-benar 25% dari harga jual)

---

## File yang Diubah

### 1. [migration_product_pricing.sql](file:///c:/development/quote/q-act/migration_product_pricing.sql) — **[BARU]**

SQL migration yang perlu dijalankan di **Supabase SQL Editor** untuk menambah kolom baru ke tabel `products`:

```sql
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS pricelist_distributor BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS diskon_distributor DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS modal BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_sales DECIMAL(5,2) DEFAULT 0;
```

> [!CAUTION]
> Jalankan SQL migration ini terlebih dahulu sebelum mencoba fitur baru di aplikasi, agar kolom baru tersedia di database.

---

### 2. [Products.jsx](file:///c:/development/quote/q-act/src/pages/Products.jsx)

**Form produk diperluas** dengan section harga baru yang terbagi menjadi dua bagian:

**Bagian Harga Distributor:**

- Input **Pricelist Distributor (Rp)**
- Input **Diskon Distributor (%)**
- Display **Harga Modal / HPP (Rp)** — auto-calculated dengan badge "Auto" berwarna biru

**Bagian Harga Jual ke Customer:**

- Input **Margin Sales (%)**
- Display **Harga Jual (Rp)** — auto-calculated dengan badge "Auto" berwarna hijau

**Logika kalkulasi (`handleProductPriceChange`):**

- Ubah pricelist/diskon → auto-hitung modal → auto-hitung price (jika margin sudah diisi)
- Ubah margin → auto-hitung price dari modal
- Ubah modal manual → auto-hitung price
- Ubah price manual → back-calculate margin dari modal

---

### 3. [QuotationEdit.jsx](file:///c:/development/quote/q-act/src/components/QuotationEdit.jsx)

**Perubahan rumus `handleItemChange`:**

| Trigger          | Formula Lama                   | Formula Baru                      |
| ---------------- | ------------------------------ | --------------------------------- |
| Input Margin%    | `Price = HPP × (1 + Margin%)`  | `Price = HPP / (1 - Margin%)`     |
| Input Price      | `Margin = (Price - HPP) / HPP` | `Margin = (Price - HPP) / Price`  |
| Input Nominal Rp | `Margin% = Markup / HPP`       | `Margin% = (Price - HPP) / Price` |
| Switch mode      | `Margin = (Price - HPP) / HPP` | `Margin = (Price - HPP) / Price`  |

**Perbaikan HPP loading:**

- Sebelum: `hpp = prod?.hpp || prod?.modal`
- Sesudah: `hpp = prod?.modal || prod?.hpp` — prioritaskan kolom `modal` yang sudah merupakan HPP setelah diskon

**UI changes:**

- Header kolom: `"Margin / Markup"` → `"Margin"`

---

### 4. [quotations.js](file:///c:/development/quote/q-act/src/pages/quotations.js) (legacy)

Update fungsi `updateCalculations`:

- `modal + margin` → `Price = Modal / (1 - Margin%)`
- `price` trigger → `Margin = (Price - Modal) / Price`

---

### 5. [api.js](file:///c:/development/quote/q-act/src/services/api.js)

Semua query `products` di dalam `quotation_items` sudah ditambah field `modal` dan `margin_sales`:

- `getQuotations`
- `getQuotationsByUser`
- `getTrashQuotations`
- `getQuotationsByBU`

---

## Langkah Selanjutnya (Manual)

1. **Jalankan SQL Migration** di Supabase SQL Editor (file `migration_product_pricing.sql`)
2. **Buka halaman Produk** → coba tambah produk baru dengan:
   - Pricelist: 1.000.000, Diskon: 20% → Modal harus otomatis jadi 800.000
   - Margin: 25% → Harga Jual harus jadi 1.066.667
3. **Buka Quotation** → pilih produk → periksa Margin di kolom item sudah pakai rumus baru
4. **Ubah Margin** di item quotation → pastikan Harga Jual terupdate dengan benar
