# Sales Zone — "Kalkulator Margin Sales"

Fitur **Sales Zone** adalah card tersembunyi pada form edit quotation yang membantu sales menghitung dan mensimulasikan margin keuntungan bersih dari setiap quotation, termasuk simulasi cashback/diskon tambahan.

---

## Gambaran Fitur

Card ini **tidak memengaruhi perhitungan quotation yang dicetak/dikirim ke customer**. Sifatnya internal untuk sales saja.

### Yang ditampilkan:

1. **Margin per item** — dihitung dari `hpp` (harga pokok dari `quotation_items`) vs `price × qty`
2. **Total margin bersih** (Rp dan %) dari seluruh item di quotation
3. **Simulator Cashback** — input fleksibel (bisa lebih dari satu), masing-masing bisa:
   - Diberi label (misal: "Cashback SO Q3")
   - Diisi nominal (Rp)
   - Melihat margin bersih **setelah cashback dikurangi**
4. **Tombol toggle** untuk membuka/menutup card (defaultnya hidden/tertutup)
5. Data simulator disimpan di tabel Supabase baru dan terhubung ke `quotation_id`

---

## Proposed Changes

### 1. Database — Tabel Baru: `quotation_sales_notes`

Perlu dibuat tabel baru di Supabase. Berikut SQL-nya (akan disertakan sebagai instruksi untuk user):

```sql
CREATE TABLE quotation_sales_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id text REFERENCES quotations(id) ON DELETE CASCADE,
  cashbacks jsonb DEFAULT '[]',  -- array of { label: string, amount: number }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE quotation_sales_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales can manage own notes" ON quotation_sales_notes
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 2. Supabase Hook — `src/hooks/useSupabase.js`

Tambahkan fungsi:

- `useQuotationSalesNote(quotationId)` — fetch data cashback untuk quotation ini
- `upsertQuotationSalesNote(quotationId, cashbacks)` — simpan/update

### 3. Komponen Baru — `src/components/SalesZoneCard.jsx`

Card terpisah yang menerima props:

- `items` — array item quotation (dengan `hpp`, `price`, `qty`)
- `quotationId` — untuk simpan ke Supabase
- `calcTax`, `ppnRate` — agar margin dihitung sesuai setting pajak

**Layout card:**

- Header: ikon kalkulator, judul "Sales Zone 🔒", tombol toggle
- Warna: soft indigo/violet (`bg-violet-50`, border `border-violet-200`)
- Tabel ringkasan margin per item
- Total margin Rp + %
- Section "Simulasi Cashback":
  - List inputan (label + nominal) yang bisa ditambah/dihapus
  - Otosave saat blur
  - Tampil margin bersih setelah total cashback

### 4. Integrasi di `src/components/QuotationEdit.jsx`

Tempatkan `<SalesZoneCard />` **di antara tabel totals (Grand Total) dan card Syarat & Ketentuan** (sekitar line 1399–1400).

---

## Open Questions

> [!IMPORTANT]
> **Apakah margin per item perlu diambil dari kolom `hpp` di tabel `quotation_items`?**
> Kolom `hpp` sudah ada di `quotation_items`. Jika `hpp = 0` atau null, margin dianggap tidak diketahui dan akan ditampilkan `-`.

> [!IMPORTANT]
> **Akses siapa yang bisa melihat Sales Zone?**
> Rencananya semua role bisa melihat (termasuk Finance & Manager) karena ini bersifat internal.
> Atau hanya Sales/Admin?

> [!NOTE]
> **Simpan otomatis atau manual?**
> Rencana: auto-save saat user blur dari input cashback. Ada indikator "Tersimpan ✓".

---

## Verification Plan

- Buka quotation edit dengan item yang ada `hpp`-nya → margin terhitung
- Tambah/hapus cashback → margin bersih berubah realtime
- Refresh halaman → data cashback masih ada (tersimpan di Supabase)
- Cetak/export quotation → Sales Zone tidak muncul di PDF (hanya UI internal)
