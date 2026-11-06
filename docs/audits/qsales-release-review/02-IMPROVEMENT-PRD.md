# Q-Sales Improvement Product Requirements Document (PRD)

**Document ID:** PRD-QSALES-001  
**Project:** Q-Sales (ACTiV Sales Portal)  
**Target Release:** Pre-Release Hotfix & Post-Release Wave 1  
**Author:** Antigravity AI Engineering Team  
**Status:** Approved for Implementation Planning  

---

## 1. Pendahuluan & Prinsip Desain

Tujuan PRD ini adalah merumuskan rencana perbaikan berbasis bukti dari temuan audit kode dengan prinsip:
1. **Zero Breaking Changes:** Menjaga alur operasional Quotation, PO, dan Sales Order yang sudah berjalan normal.
2. **Surgical Precision:** Melakukan perubahan minimal pada baris yang terdampak untuk menghindari regresi.
3. **Strict Prioritization:**
   - **P0 (Pre-Release Blocker):** Lubang otorisasi data lead, webhook tanpa autentikasi, dan kalkulasi salah pada SO cost.
   - **P1 (Post-Release Immediate Patch):** Enkripsi kredensial di database, dukungan multiple PO di Lead Detail, penambahan kolom notes SO, dan idempotency webhook.
   - **P2 (Backlog Optimization):** Pagination kanban lead, async loading modal customer, dan migrasi Google OAuth 2 arah.

---

## 2. Rincian Kebutuhan Perbaikan (Prioritas P0 — Pre-Release)

### Item P0-1: Otorisasi Kepemilikan pada Mutasi Lead & PIC
- **Problem Statement:** Sales A dapat memindahkan stage, mengarsipkan, menambah PIC, atau menghapus PIC pada Lead milik Sales B tanpa validasi hak akses.
- **Affected Files:**
  - `app/Http/Controllers/LeadController.php` (lines 325-355, 390-444, 448-453)
- **Proposed Technical Approach:**
  Gunakan service `WorkflowAccess` yang sudah ada:
  ```php
  // Pada updateStage() dan destroy():
  WorkflowAccess::lead($request->user(), $lead);
  abort_unless(WorkflowAccess::canManage($request->user()), 403, 'Anda tidak memiliki hak untuk mengubah lead ini.');

  // Pada storePic() dan destroyPic():
  WorkflowAccess::lead($request->user(), $lead);
  abort_unless(WorkflowAccess::canManage($request->user()), 403);
  ```
- **Acceptance Criteria:**
  1. Sales A mencoba memindahkan stage Lead milik Sales B (beda BU/tanpa hak akses) ➔ Mendapatkan respon HTTP 403 atau 404 (Lead not found in scope).
  2. Sales A mencoba DELETE ke `/leads/{lead_id}` milik Sales B ➔ Mendapatkan HTTP 403/404.
  3. Sales A mencoba POST `/leads/{lead_id}/pics` ke lead orang lain ➔ Mendapatkan HTTP 403/404.
  4. Manager / Admin tetap dapat mengelola seluruh lead tanpa hambatan.
- **Effort:** Small (S)
- **Regression Risk:** Low (tidak mengubah struktur data DB).

---

### Item P0-2: Formula Grand Total pada Penambahan Biaya SO (`storeCost`)
- **Problem Statement:** Pada `SalesOrderController::storeCost()`, grand total di-update hanya menggunakan `$totalItemVal` tanpa menambahkan `$totalCost`. Sedangkan pada `destroyCost()`, grand total menggunakan formula `$totalItemVal + $totalCost`.
- **Affected Files:**
  - `app/Http/Controllers/SalesOrderController.php` (line 362)
- **Proposed Technical Approach:**
  Sesuaikan perhitungan di `storeCost()` agar selaras dengan `destroyCost()`:
  ```php
  // app/Http/Controllers/SalesOrderController.php line 362
  'grand_total' => $totalItemVal + $totalCost,
  ```
- **Acceptance Criteria:**
  1. Buat SO dengan nilai barang Rp 10.000.000.
  2. Tambahkan biaya operasional (misal Biaya Ekspedisi Rp 500.000).
  3. `grand_total` pada SO tersimpan dan tampil Rp 10.500.000 (bukan tetap Rp 10.000.000).
  4. Hapus biaya tersebut ➔ `grand_total` kembali ke Rp 10.000.000.
- **Effort:** Small (S)
- **Regression Risk:** Very Low.

---

### Item P0-3: Verifikasi Signature Zoom Webhook pada Event Incoming
- **Problem Statement:** Endpoint `/webhooks/zoom` hanya memverifikasi HMAC pada handshake awal (`endpoint.url_validation`). Event sesungguhnya (`meeting.ended`, `recording.completed`) dieksekusi tanpa validasi header `x-zm-signature` dan `x-zm-request-timestamp`.
- **Affected Files:**
  - `app/Http/Controllers/LeadController.php` (lines 1146-1203)
- **Proposed Technical Approach:**
  Buat fungsi verifikasi signature HMAC Zoom standar:
  ```php
  $message = 'v0:' . $request->header('x-zm-request-timestamp') . ':' . $request->getContent();
  $hash = hash_hmac('sha256', $message, $secret);
  $expectedSignature = 'v0=' . $hash;

  if (!hash_equals($expectedSignature, (string)$request->header('x-zm-signature'))) {
      return response()->json(['message' => 'Invalid signature'], 401);
  }
  ```
- **Acceptance Criteria:**
  1. POST request tanpa header `x-zm-signature` yang valid ditolak dengan status 401 Unauthorized.
  2. Request asli dari Zoom dengan signature yang sah diproses sukses (HTTP 200).
- **Effort:** Small (S)
- **Regression Risk:** Low (hanya berdampak pada webhook eksternal).

---

## 3. Rincian Kebutuhan Perbaikan (Prioritas P1 — Post-Release Wave 1)

### Item P1-1: Dukungan Multiple PO pada Tab PO & SO Lead Detail
- **Problem Statement:** Tab PO & Sales Order di Lead Detail hanya menampilkan 1 PO dari kolom flat `quotations.po_number`, mengabaikan PO kedua dan seterusnya yang tersimpan di tabel `quotation_purchase_orders`.
- **Affected Files:**
  - `app/Http/Controllers/LeadController.php` (line 293-300)
  - `resources/js/Pages/LeadDetail.jsx` (lines 514-570, 1450)
- **Proposed Technical Approach:**
  - Di `LeadController::show()`, tambahkan eager loading `quotations.purchaseOrders`.
  - Di `LeadDetail.jsx`, gabungkan list `purchaseOrders` dari setiap quotation untuk dirender secara lengkap.
- **Acceptance Criteria:**
  Jika sebuah quotation memiliki 2 PO terpisah (misal PO 001/A dan PO 001/B), kedua kartu PO tersebut muncul di tab "PO & Sales Order".
- **Effort:** Medium (M)
- **Priority:** P1

---

### Item P1-2: Penambahan Kolom dan Fillable `notes` pada Sales Order
- **Problem Statement:** Form update SO mengirimkan `notes`, namun tidak tersimpan karena kolom `notes` belum ada di tabel `sales_orders` dan model `$fillable`.
- **Affected Files:**
  - `database/migrations/xxxx_add_notes_to_sales_orders_table.php` (buat migration baru)
  - `app/Models/SalesOrder.php` (tambahkan `'notes'` ke `$fillable`)
- **Acceptance Criteria:**
  Input catatan pada Sales Order tersimpan di database dan tetap muncul setelah reload halaman.
- **Effort:** Small (S)
- **Priority:** P1

---

### Item P1-3: Enkripsi Kredensial Sensitif di Database
- **Problem Statement:** Nilai `private_key` Google Service Account dan Zoom `client_secret` disimpan dalam format JSON plain text di tabel `system_settings`.
- **Affected Files:**
  - `app/Models/SystemSetting.php`
  - Buat migration enkripsi untuk mengenkripsi value kredensial yang sudah ada di database menggunakan `Crypt::encryptString`.
- **Acceptance Criteria:**
  Nilai kredensial di kolom `value` database terenkripsi (tidak terbaca plain string RSA), namun tetap didekripsi otomatis saat diakses service.
- **Effort:** Medium (M)
- **Priority:** P1

---

### Item P1-4: Replay Protection & Idempotency Webhook Zoom
- **Problem Statement:** Retry webhook Zoom dapat memicu duplikasi entri riwayat meeting di timeline lead.
- **Proposed Technical Approach:**
  - Validasi timestamp `x-zm-request-timestamp`: tolak request jika selisih > 300 detik (5 menit).
  - Simpan/cek hash event webhook di cache/DB selama 24 jam sebelum eksekusi log.
- **Effort:** Small (S)
- **Priority:** P1

---

## 4. Backlog & Peningkatan Jangka Panjang (Prioritas P2)

| Item ID | Fitur | Keterangan | Effort |
|---|---|---|---|
| P2-1 | Kanban Virtualization / Column Limit | Batasi render card per stage (default 20 card + tombol "Muat lebih banyak") untuk performa saat ribuan data. | Medium (M) |
| P2-2 | Lazy Loading Customers di Modal Lead | Pindahkan pemuatan list Customer & PIC ke endpoint pencarian asynchronous (Select2 / Combobox debounced). | Medium (M) |
| P2-3 | Migrasi Google Calendar OAuth 2.0 | Implementasikan alur OAuth per user agar dapat mengundang email peserta customer secara langsung. | Large (L) |
| P2-4 | Pipeline Forecast Setting (Alternative Quotes) | Opsi pada quotation untuk menandai penawaran sebagai "Opsi Alternatif" agar tidak dihitung ganda pada dashboard revenue. | Medium (M) |

---

## 5. Rollback & Migration Safety Plan

1. **Prinsip Migrasi Aman:** Seluruh migrasi database baru hanya bersifat `ADD COLUMN` nullable (`notes`), tanpa mengubah tipe data kolom yang sudah ada.
2. **Rollback Approach:**
   - Untuk hotfix P0 (hanya file Controller): Rollback dapat dilakukan via `git revert` tanpa dampak pada struktur database.
   - Untuk P1 (migration notes): Sediakan method `down()` yang melakukan `dropColumn('notes')`.

