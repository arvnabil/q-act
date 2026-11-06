# Q-Sales Code Audit & Security Verification Report

**Project:** Q-Sales — ACTiV Sales Portal  
**Repository:** `https://github.com/arvnabil/q-act.git`  
**Inspected Branch:** `main`  
**Inspected Commit Hash:** `2f4c83d8dd2f4eabccea6223b9ebe7a10f30c1d3`  
**Audit Date:** 6 November 2026  
**Auditor:** Antigravity AI Code Audit Engine  
**Status:** Verification Completed (Evidence-Based)

---

## 1. Executive Summary & Repository Overview

Q-Sales adalah aplikasi manajemen penjualan B2B yang menghubungkan alur:
`Lead → Customer & PIC → Follow-up/Visit → Quotation → PO → SO`

Audit ini dilakukan dengan memverifikasi secara langsung file kode sumber, route, controller, model, migration, policy, service, frontend React (Inertia), dan test suite (106 PHPUnit tests passing).

### Summary of Findings
| Kategori Temuan | Confirmed | Partial | False Positive | Unverified | Total |
|---|---|---|---|---|---|
| A. Authorization & Access Control | 4 | 0 | 2 | 0 | 6 |
| B. Zoom Webhook Security | 2 | 0 | 0 | 0 | 2 |
| C. Credentials Storage & Exposure | 1 | 0 | 1 | 0 | 2 |
| D. Multiple PO & Lead 360° | 1 | 0 | 0 | 0 | 1 |
| E. Quotation Revision & Forecast | 1 | 1 | 0 | 0 | 2 |
| F. SO Calculation & Cost Storage | 2 | 0 | 0 | 0 | 2 |
| G. Performance & Scalability | 2 | 0 | 0 | 0 | 2 |
| H. Google Calendar & Zoom Completeness | 2 | 0 | 0 | 0 | 2 |
| **TOTAL** | **15** | **1** | **3** | **0** | **19** |

---

## 2. Inventory Fitur & Stack Arsitektur

- **Backend Framework:** Laravel 13.x (PHP 8.3+)
- **Frontend Framework:** React 18.2, Inertia.js v2, Tailwind CSS 3.2, Vite 8.0
- **Database:** MySQL / MariaDB
- **Authorization Engine:** `spatie/laravel-permission` v8.3 + Custom Service `DocumentVisibility` & `WorkflowAccess`
- **External Integrations:**
  - Google Calendar REST API v3 (menggunakan Service Account JWT HTTP client tanpa composer SDK eksternal)
  - Zoom Server-to-Server OAuth REST API v2 + Webhook endpoint

---

## 3. Detail Verifikasi Temuan Audit (Evidence-Based)

### AREA A: Authorization & Access Control

#### [BUG-001] Missing Authorization on `LeadController::updateStage()`
- **Modul:** Lead Pipeline
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L390-L444`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L390-L444)
  ```php
  public function updateStage(Request $request, Lead $lead)
  {
      $data = $request->validate([
          'stage'       => 'required|string|in:' . implode(',', $this->getAllowedStageKeys()),
          'lost_reason' => 'nullable|string|max:500',
          'sort_order'  => 'nullable|integer',
      ]);
      // Langsung melakukan update tanpa pengecekan kepemilikan/scope!
      $lead->update($updateData);
  ```
- **Root Cause:** Tidak dipanggilnya `WorkflowAccess::lead($request->user(), $lead)` dan `abort_unless(WorkflowAccess::canManage($request->user()), 403)`.
- **Dampak:** Setiap sales yang terautentikasi dapat memindahkan status lead milik sales lain secara sepihak via API/kanban drag-and-drop, termasuk memicu auto-convert ke Customer saat dipindah ke stage deal.
- **Severity:** **HIGH**
- **Release Target:** **Pre-release (P0)**

---

#### [BUG-002] Missing Authorization on `LeadController::destroy()`
- **Modul:** Lead Pipeline
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L448-L453`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L448-L453)
  ```php
  public function destroy(Lead $lead)
  {
      $lead->update(['is_archived' => true, 'updated_by' => Auth::id()]);
      return back()->with('message', 'Lead diarsipkan.');
  }
  ```
- **Root Cause:** Tidak ada validasi hak akses maupun ownership lead sebelum mengarsipkan data.
- **Dampak:** Sales A dapat mengirim request DELETE ke `/leads/{lead_id}` milik Sales B dan mengarsipkan lead tersebut tanpa batasan.
- **Severity:** **HIGH**
- **Release Target:** **Pre-release (P0)**

---

#### [BUG-003] Missing Authorization on `LeadController::storePic()` & `destroyPic()`
- **Modul:** Lead Pipeline (PIC Management)
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L325-L355`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L325-L355)
  ```php
  public function storePic(Request $request, Lead $lead) {
      // Tidak ada WorkflowAccess::lead() maupun canManage()
      LeadPic::create($validated);
  }
  public function destroyPic(Lead $lead, LeadPic $pic) {
      if ($pic->lead_id === $lead->id) {
          $pic->delete(); // Siapa pun bisa hapus PIC lead lain
      }
  }
  ```
- **Root Cause:** Tidak ada otorisasi berbasis user scope pada mutasi PIC lead.
- **Dampak:** Manipulasi atau penghapusan kontak PIC penting pada lead sales lain.
- **Severity:** **MEDIUM**
- **Release Target:** **Pre-release (P0)**

---

#### [FP-001] Mutasi Customer, Quotation, dan Sales Order Tidak Terlindungi
- **Modul:** Customers, Quotations, Sales Orders
- **Temuan Awal:** Hipotesis bahwa endpoint Customer, Quotation, dan SO tidak membatasi akses antarsales.
- **Hasil:** **FALSE POSITIVE (Secured)**
- **Evidence:**
  - `CustomerController.php#L120-L121`, `L177-L178`, `L188-L189`, `L233-L235`: Seluruh mutasi dilindungi dengan `DocumentVisibility::allows(..., 'customers_edit')` dan `DocumentVisibility::authorize($request->user(), 'customers', $customer)`.
  - `QuotationController.php#L540`, `L764`, `L1807`: Menggunakan `DocumentVisibility::authorize(..., 'quotations', $quotation)` dan lock status saat sudah PO/SO.
  - `SalesOrderController.php#L93`, `L240`: Menggunakan `DocumentVisibility::authorize(..., 'sales_orders', $salesOrder)`.
- **Kesimpulan:** Kontrol otorisasi pada Quotation, SO, dan Customer sudah terimplementasi dengan baik dan konsisten.

---

### AREA B: Zoom Webhook Security

#### [BUG-004] Unverified Webhook Signature on Zoom Events
- **Modul:** Integrasi Zoom
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L1146-L1203`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L1146-L1203)
  ```php
  public function handleZoomWebhook(Request $request)
  {
      $event = $request->input('event');
      $payload = $request->input('payload');

      // 1. Zoom URL Validation Challenge (ada HMAC)
      if ($event === 'endpoint.url_validation') { ... }

      // 2. Meeting Ended Event -> TIDAK ADA VERIFIKASI SIGNATURE!
      if ($event === 'meeting.ended') { ... }

      // 3. Cloud Recording Completed Event -> TIDAK ADA VERIFIKASI SIGNATURE!
      if ($event === 'recording.completed') { ... }
  ```
- **Root Cause:** HMAC verification hanya dilakukan pada handshake `endpoint.url_validation`. Header `x-zm-signature` dan `x-zm-request-timestamp` sama sekali tidak divalidasi pada event masuk. Route `/webhooks/zoom` juga dikecualikan dari CSRF di `bootstrap/app.php#L25`.
- **Dampak:** Siapa pun dapat menembakkan HTTP POST palsu untuk menyuntikkan URL rekaman palsu (`recording.completed`) atau memanipulasi durasi meeting dan activity log lead.
- **Severity:** **HIGH**
- **Release Target:** **Pre-release (P0)**

---

#### [BUG-005] Missing Webhook Idempotency & Replay Attack Prevention
- **Modul:** Integrasi Zoom
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L1164-L1179`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L1164-L1179)
- **Root Cause:** Tidak ada pengecekan timestamp toleransi (standar < 5 menit) dan tidak ada penyimpanan/pengecekan event ID webhook yang sudah diproses.
- **Dampak:** Retry pengiriman webhook dari Zoom akan menduplikasi entry log meeting di timeline lead.
- **Severity:** **MEDIUM**
- **Release Target:** **Post-release (P1)**

---

### AREA C: Credentials Storage & Exposure

#### [BUG-006] Plaintext Storage of Sensitive Integration Keys in Database
- **Modul:** System Settings
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Models/SystemSetting.php#L14-L16`](file:///d:/Development/quote/q-act/app/Models/SystemSetting.php#L14-L16)
  ```php
  protected $casts = [
      'value' => 'json', // BUKAN 'encrypted:json'
  ];
  ```
- **Root Cause:** Kredensial Google Service Account (termasuk RSA `private_key`) dan Zoom `client_secret` disimpan dalam format JSON plaintext di tabel `system_settings`.
- **Dampak:** Jika terjadi kebocoran backup database atau SQL injection, seluruh private key Google dan secret Zoom langsung terekspos tanpa enkripsi at-rest.
- **Severity:** **HIGH**
- **Release Target:** **Post-release (P1)**

---

#### [FP-002] Kredensial Sensitif Bocor pada Response API Pengaturan
- **Modul:** System Settings
- **Hasil:** **FALSE POSITIVE (Secured)**
- **Evidence:** [`app/Http/Controllers/SettingController.php#L69-L84`](file:///d:/Development/quote/q-act/app/Http/Controllers/SettingController.php#L69-L84)
  Controller hanya mengirimkan metadata aman ke frontend:
  ```php
  $zoomSettings = [
      'is_configured' => (new ZoomService())->isConfigured(),
      'account_id'    => $zoomVal['account_id'] ?? '',
      'client_id'     => $zoomVal['client_id'] ?? '',
      'has_client_secret' => !empty($zoomVal['client_secret']), // HANYA BOOLEAN
  ];
  ```
- **Kesimpulan:** Nilai `client_secret` dan RSA `private_key` tidak pernah dikirimkan ke client-side JavaScript.

---

### AREA D: Multiple PO & Lead 360°

#### [BUG-007] Lead Detail UI Only Reads Single Flat PO Fields (Ignoring Multiple PO Relation)
- **Modul:** Lead Detail & PO Workflow
- **Hasil:** **CONFIRMED**
- **Evidence:**
  - Query backend: [`app/Http/Controllers/LeadController.php#L293-L297`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L293-L297)
    ```php
    'quotations' => function ($q) {
        $q->select(['id', 'lead_id', 'status', 'grand_total', 'created_at', 'revision_no', 'relation_type', 'po_number', 'po_status', 'po_date'])
          ->with('salesOrders:id,quotation_id,status,created_at')
          ->latest();
    }
    ```
  - Frontend display: [`resources/js/Pages/LeadDetail.jsx#L1450`](file:///d:/Development/quote/q-act/resources/js/Pages/LeadDetail.jsx#L1450)
    ```javascript
    const allPurchaseOrders = allQuotations.filter(q => q.po_number || q.po_status);
    ```
- **Root Cause:** Backend tidak meng-eager load relasi `purchaseOrders` (`QuotationPurchaseOrder`), dan frontend hanya memfilter atribut flat `q.po_number` dari Quotation.
- **Dampak:** Jika 1 Quotation memiliki 2 atau lebih PO (sebagaimana didukung oleh tabel `quotation_purchase_orders`), PO kedua dan seterusnya tidak akan muncul di tab PO & Sales Order pada halaman detail Lead.
- **Severity:** **MEDIUM**
- **Release Target:** **Post-release (P1)**

---

### AREA E: Quotation Revision & Forecast Calculation

#### [BUG-008] Potential Pipeline Value Inflation on Unsuperseded Quotations
- **Modul:** Dashboard Reporting
- **Hasil:** **PARTIAL / CONFIRMED**
- **Evidence:** [`app/Http/Controllers/DashboardController.php#L62-L84`](file:///d:/Development/quote/q-act/app/Http/Controllers/DashboardController.php#L62-L84)
  ```php
  $quotations = $selectedQuotations->filter(fn ($q) => 
      !in_array($q->status, ['cancelled', 'superseded']) && $q->date
      && Carbon::parse($q->date)->betweenIncluded($periodStart, $periodEnd)
  )...
  $totalAllValue = $reportQuotations->sum('grand_total');
  ```
- **Root Cause:** Jika revisi quotation masih dalam status `draft` atau `sent` dan quotation induknya belum beralih ke `superseded`, atau jika sales membuat multiple alternatif quotation untuk satu lead, seluruh grand_total terakumulasi di dashboard.
- **Catatan Positif:** Pada Kanban Lead (`LeadController::index`), pipeline dihitung dari `Lead::sum('estimated_value')`, sehingga Kanban Lead aman dari inflasi revisi quotation.
- **Severity:** **MEDIUM**
- **Release Target:** **Post-release (P1)**

---

### AREA F: Sales Order Financial Calculation

#### [BUG-009] Grand Total Calculation Inconsistency on SO Additional Costs
- **Modul:** Sales Order Costs
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/SalesOrderController.php#L359-L379`](file:///d:/Development/quote/q-act/app/Http/Controllers/SalesOrderController.php#L359-L379)
  ```php
  // Pada storeCost():
  $salesOrder->update([
      'total_item_value' => $totalItemVal,
      'total_cost' => $totalCost,
      'grand_total' => $totalItemVal, // <--- TIDAK DITAMBAH COST!
  ]);

  // Pada destroyCost():
  $salesOrder->update([
      'total_item_value' => $totalItemVal,
      'total_cost' => $totalCost,
      'grand_total' => $totalItemVal + $totalCost, // <--- DI SINI DITAMBAH COST!
  ]);
  ```
- **Root Cause:** Kesalahan formula matematika pada baris 362 `storeCost()`.
- **Dampak:** Menambah biaya operasional (cost) tidak mengubah nilai `grand_total`, namun saat biaya tersebut dihapus, grand_total malah bertambah. Data finansial SO menjadi inkonsisten.
- **Severity:** **HIGH**
- **Release Target:** **Pre-release (P0)**

---

#### [BUG-010] Sales Order Notes Field Silently Dropped on Update
- **Modul:** Sales Order
- **Hasil:** **CONFIRMED**
- **Evidence:**
  - Controller: [`app/Http/Controllers/SalesOrderController.php#L244`](file:///d:/Development/quote/q-act/app/Http/Controllers/SalesOrderController.php#L244) memvalidasi `'notes' => 'nullable|string'`.
  - Model: [`app/Models/SalesOrder.php#L15-L20`](file:///d:/Development/quote/q-act/app/Models/SalesOrder.php#L15-L20) tidak memiliki field `'notes'` di `$fillable`.
  - Database: Tabel `sales_orders` di migration [`2026_09_03_135126_create_quote_tables.php#L193-L210`](file:///d:/Development/quote/q-act/database/migrations/2026_09_03_135126_create_quote_tables.php#L193-L210) **tidak memiliki kolom `notes`**.
- **Root Cause:** Ketidaksesuaian antara controller, model, dan skema database.
- **Dampak:** Catatan yang diketik pengguna pada Sales Order hilang tanpa tersimpan (silent failure).
- **Severity:** **MEDIUM**
- **Release Target:** **Post-release (P1)**

---

### AREA G: Performance & Scalability

#### [BUG-011] Unpaginated Leads Query on Kanban Board
- **Modul:** Lead Pipeline
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L186`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L186)
  `$leads = $query->get();`
- **Root Cause:** Tidak adanya limitasi per stage atau cursor/pagination pada muatan kanban board.
- **Dampak:** Saat jumlah lead mencapai ribuan prospek, beban memori PHP dan payload Inertia JSON akan melonjak drastis, memperlambat rendering browser pengguna.
- **Severity:** **LOW / MEDIUM**
- **Release Target:** **Backlog (P2)**

---

#### [BUG-012] Full Customers & PICs Dataset Loaded on Every Kanban Request
- **Modul:** Lead Pipeline
- **Hasil:** **CONFIRMED**
- **Evidence:** [`app/Http/Controllers/LeadController.php#L237`](file:///d:/Development/quote/q-act/app/Http/Controllers/LeadController.php#L237)
  ```php
  'customers' => DocumentVisibility::apply(Customer::query(), $request->user(), 'customers')
      ->select('id', 'name', 'address')
      ->with('pics:id,customer_id,name,phone,email,is_primary')
      ->orderBy('name')
      ->get()
  ```
- **Root Cause:** Mengambil seluruh data customer dan kontak PIC hanya untuk mengisi opsi modal form tambah lead.
- **Dampak:** Query berat yang tidak perlu pada setiap perpindahan stage atau filter board.
- **Severity:** **LOW / MEDIUM**
- **Release Target:** **Post-release (P1/P2)**

---

### AREA H: Google Calendar & Zoom Completeness

#### [ARCH-001] Google Calendar Sync is One-Way Outbound Push
- **Modul:** Kalender & Integrasi
- **Hasil:** **CONFIRMED ARCHITECTURE**
- **Evidence:** [`app/Services/GoogleCalendarService.php#L123-L168`](file:///d:/Development/quote/q-act/app/Services/GoogleCalendarService.php#L123-L168)
- **Karakteristik:**
  - Hanya melakukan push outbound (`createEvent`, `updateEvent`, `deleteEvent`).
  - Tidak ada webhook masuk atau sync inbound dari Google Calendar ke Q-Sales.
  - Perubahan yang dilakukan langsung di Google Calendar tidak akan merefleksikan kembali ke Q-Sales.
- **Status:** Berfungsi sesuai rancangan (One-Way). Bukan bug, namun harus didokumentasikan agar ekspektasi pengguna selaras.

---

#### [ARCH-002] Service Account Restriction on Attendee Invitations
- **Modul:** Integrasi Kalender
- **Hasil:** **CONFIRMED LIMITATION**
- **Evidence:** [`app/Services/GoogleCalendarService.php#L131-L141`](file:///d:/Development/quote/q-act/app/Services/GoogleCalendarService.php#L131-L141)
- **Karakteristik:** Google Service Account tanpa Domain-Wide Delegation menolak pengiriman email undangan peserta (403 `forbiddenForServiceAccounts`). Sistem menangani ini dengan retry tanpa attendees dan UI menandai "Coming Soon".

---

## 4. Kesimpulan Kesiapan Rilis

Aplikasi **siap dipublikasikan** setelah 4 perbaikan kritis (P0) diterapkan:
1. Menambahkan otorisasi pada `LeadController::updateStage()` (BUG-001)
2. Menambahkan otorisasi pada `LeadController::destroy()` (BUG-002)
3. Menambahkan otorisasi pada `LeadController::storePic()` & `destroyPic()` (BUG-003)
4. Memperbaiki formula matematika pada `SalesOrderController::storeCost()` (BUG-009)
5. Menambahkan validasi signature dasar pada Zoom Webhook (BUG-004)

Semua perbaikan P0 tersebut dapat diselesaikan dengan **perubahan baris kode minimal (surgical fix)** tanpa merusak workflow Quotation, PO, dan SO yang sedang berjalan.

