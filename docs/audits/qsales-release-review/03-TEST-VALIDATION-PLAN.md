# Q-Sales QA & Validation Test Plan

**Document ID:** QA-QSALES-001  
**Project:** Q-Sales (ACTiV Sales Portal)  
**Tujuan:** Panduan pengujian langkah-demi-langkah (manual & automated) yang dapat direproduksi secara mandiri sebelum publikasi dan saat acceptance testing.

---

## 1. Prasyarat & Lingkungan Pengujian

### A. Environment
- **Aplikasi:** Local development / Staging server
- **Database:** MySQL / MariaDB dengan migrasi terbaru (`php artisan migrate`)
- **Browser:** Google Chrome / Firefox / Safari (disarankan mode Incognito saat menguji multi-role)
- **Tool Tambahan:** Postman / cURL untuk negative testing endpoint API

### B. Akun & Role yang Diperlukan
Siapkan 4 akun pengujian berikut:
1. **User Admin:** `admin@activ.co.id` (Role: `Administrator`)
2. **User Manager:** `manager@activ.co.id` (Role: `Manager` / `Sales Manager`)
3. **User Sales A:** `sales.a@activ.co.id` (Role: `Sales`, Business Unit: `BU IT Solution`)
4. **User Sales B:** `sales.b@activ.co.id` (Role: `Sales`, Business Unit: `BU Smart Office` — berbeda BU)

---

## 2. Rincian Skenario Pengujian End-to-End

---

### TC-01: Lead & Multi-PIC Management
- **Test ID:** `TC-LEAD-01`
- **Tujuan:** Memverifikasi pembuatan Lead dengan satu perusahaan dan beberapa PIC berbeda tanpa duplikasi data.
- **Akun Diperlukan:** `sales.a@activ.co.id` (Sales)
- **Data Dummy:**
  - Perusahaan: `PT Nusantara Digital Solusindo`
  - PIC 1: `Bpk. Budi Santoso` (Role: Purchasing, Email: `budi@digital.id`, Telp: `081234567890`)
  - PIC 2: `Ibu Maya` (Role: Technical, Email: `maya@digital.id`, Telp: `081298765432`)
- **Langkah Klik Pengujian (UI):**
  1. Login sebagai Sales A.
  2. Buka menu **Lead Pipeline** ➔ Klik tombol **+ Tambah Lead** di kanan atas.
  3. Isi Judul: `Pengadaan CCTV & Access Control Kantor Pusat`.
  4. Pilih/Ketik Customer: `PT Nusantara Digital Solusindo`.
  5. Masukkan PIC Utama: `Bpk. Budi Santoso`, jabatan Purchasing, no telepon dan email.
  6. Simpan Lead.
  7. Masuk ke halaman **Detail Lead** yang baru dibuat.
  8. Buka tab **Kontak PIC** ➔ Klik tombol **+ Tambah PIC**.
  9. Masukkan PIC kedua: `Ibu Maya`, role Technical. Klik Simpan.
- **Expected Result:**
  - Kedua PIC tampil pada tab "Kontak PIC" dengan badge perannya masing-masing.
  - Di database `customers` dan `customer_pics`, data terhubung rapi ke customer ID yang sama tanpa membuat duplikasi entitas customer.
- **Status:** PASS (Sudah terverifikasi pada model & controller).
- **Cleanup:** Arsipkan Lead melalui tombol Hapus di halaman Detail Lead.

---

### TC-02: Lead & Multiple Quotation serta Revisi
- **Test ID:** `TC-QUOTE-02`
- **Tujuan:** Menguji pembuatan lebih dari satu Quotation dari satu Lead yang sama serta alur revisi quotation.
- **Akun Diperlukan:** `sales.a@activ.co.id`
- **Data Dummy:**
  - Lead ID dari TC-01.
  - Quotation 1: `Penawaran CCTV Paket Standar` (Nilai Rp 25.000.000)
  - Quotation 2: `Penawaran CCTV Paket Premium` (Nilai Rp 40.000.000)
- **Langkah Klik Pengujian (UI):**
  1. Pada halaman Detail Lead TC-01, buka tab **Quotation** ➔ Klik **+ Buat Quotation**.
  2. Tambahkan item produk CCTV Standar, set total Rp 25.000.000, lalu klik **Simpan Draft**.
  3. Kembali ke Detail Lead ➔ Klik lagi **+ Buat Quotation** untuk opsi kedua.
  4. Tambahkan item produk CCTV Premium, set total Rp 40.000.000, lalu simpan.
  5. Buka Quotation 1 ➔ Klik **Kirim Penawaran (Sent)**.
  6. Lakukan revisi pada Quotation 1 (misal mengubah kuantiti item).
- **Expected Result:**
  - Tab "Quotation" di Lead Detail menampilkan 2 penawaran terpisah.
  - Pada Quotation 1, revisi tercatat dengan nomor revisi bertambah (`Rev 1`), status penawaran lama tercatat, dan timeline aktivitas lead mencatat event penautan quotation.
- **Status:** PASS.

---

### TC-03: Purchase Order (PO) & Sales Order (SO)
- **Test ID:** `TC-POSO-03`
- **Tujuan:** Memvalidasi pencatatan PO dari customer, upload dokumen PO, dan pembentukan Sales Order (SO) otomatis.
- **Akun Diperlukan:** `sales.a@activ.co.id`
- **Data Dummy:**
  - Nomor PO: `PO-NDS-2026-089`
  - File PO: Dokumen PDF contoh (`sample_po.pdf`, < 5MB)
- **Langkah Klik Pengujian (UI):**
  1. Buka Quotation yang sudah disetujui customer.
  2. Ubah status menjadi **Approved (PO Diterima)** atau klik tombol **Catat PO**.
  3. Masukkan nomor PO: `PO-NDS-2026-089`, tanggal PO, dan upload file dokumen PO.
  4. Klik Simpan.
  5. Buka menu **Sales Orders** di sidebar.
- **Expected Result:**
  - Sebuah Sales Order baru dengan kode `SO.[ID_QUOTATION]` terbentuk otomatis.
  - Field PO Number, PO Date, dan tautan file PO terbawa ke detail Sales Order.
  - Di Lead Detail tab "PO & Sales Order", kartu transaksi muncul dengan status "Diterima".
- **Status:** PASS.

---

### TC-04: Lead Timeline & Activity Log
- **Test ID:** `TC-TIME-04`
- **Tujuan:** Memverifikasi pencatatan interaksi cepat (Call, WhatsApp, Catatan, Visit, Meeting).
- **Akun Diperlukan:** `sales.a@activ.co.id`
- **Langkah Klik Pengujian (UI):**
  1. Buka Detail Lead.
  2. Di kolom kiri (Card Catat Hasil Komunikasi), klik tombol **Sudah dihubungi** atau **Minta penawaran**.
  3. Pilih jenis komunikasi (Telepon / WhatsApp) dan ketik catatan singkat: `Klien meminta penyesuaian termin pembayaran`.
  4. Klik Simpan / Tambahkan.
  5. Periksa tab **Timeline & Aktivitas** di sebelah kanan.
- **Expected Result:**
  - Aktivitas baru muncul di urutan paling atas dengan timestamp yang tepat.
  - Aktivitas buatan sales memiliki tombol edit/hapus pada hover, sedangkan event yang dihasilkan otomatis oleh sistem (seperti perubahan stage) tidak memiliki tombol hapus.
- **Status:** PASS.

---

### TC-05: Access Control & Authorization (Negative Testing)
- **Test ID:** `TC-AUTH-05`
- **Tujuan:** Membuktikan bahwa Sales dari BU berbeda tidak dapat melihat atau memodifikasi data satu sama lain jika cakupan data diatur "Data sendiri" atau "Data sendiri + BU".
- **Akun Diperlukan:** `sales.a@activ.co.id` (BU IT Solution) dan `sales.b@activ.co.id` (BU Smart Office)
- **Langkah Pengujian:**
  1. **Pengujian Melihat (Read):**
     - Sales A membuat Lead `Lead Rahasia Proyek A`.
     - Login sebagai Sales B ➔ Buka menu Lead Pipeline.
     - *Expected:* Lead milik Sales A **tidak muncul** di kanban Sales B.
  2. **Pengujian Mutasi URL Langsung (Negative Test):**
     - Dapatkan ID Lead Sales A (`LEAD_UUID_A`).
     - Login sebagai Sales B, coba akses langsung browser ke: `/leads/{LEAD_UUID_A}`.
     - *Expected:* Aplikasi merespon **404 Not Found** (karena ter-filter oleh query scope).
  3. **Pengujian Mutasi API (Stage Update via Postman):**
     - Kirim HTTP PATCH ke `/leads/{LEAD_UUID_A}/stage` dengan cookies session Sales B.
     - *Expected (Pasca Hotfix P0-1):* HTTP 403 Forbidden / 404 Not Found.
- **Status:** NOT RUN (Akan dieksekusi setelah patch P0-1 diterapkan).

---

### TC-06: Dashboard Financial Reporting
- **Test ID:** `TC-DASH-06`
- **Tujuan:** Memvalidasi bahwa angka total pipeline, conversion rate, dan total PO value di Dashboard mencerminkan transaksi nyata.
- **Akun Diperlukan:** `manager@activ.co.id` (Manager)
- **Langkah Pengujian:**
  1. Buka menu **Dashboard**.
  2. Catat angka awal: Total Quotation Value, Approved PO Value, dan Conversion Rate.
  3. Buat Quotation baru senilai Rp 10.000.000.
  4. Refresh Dashboard basis "Quotation" ➔ Nilai Total Quotation bertambah tepat Rp 10.000.000.
  5. Approve Quotation tersebut menjadi PO.
  6. Pindah ke tab basis "Purchase Order (PO)" di Dashboard ➔ Nilai Total PO bertambah Rp 10.000.000.
- **Expected Result:**
  - Perhitungan matematis antara tab Quotation dan tab PO konsisten.
  - Filter rentang tanggal (Bulan Ini / Custom Range) memfilter data berdasarkan tanggal dokumen secara tepat.
- **Status:** PASS.

---

### TC-07: Google Calendar Agenda & Synchronization
- **Test ID:** `TC-GCAL-07`
- **Tujuan:** Menguji pembuatan jadwal tindak lanjut, sinkronisasi ke kalender Google, reschedule, dan pembatalan.
- **Akun Diperlukan:** `sales.a@activ.co.id`
- **Prasyarat:** Integrasi Google Calendar telah terkonfigurasi di Pengaturan dengan Service Account aktif.
- **Langkah Klik Pengujian (UI):**
  1. Masuk ke halaman **Kalender** atau card **Proyek & Tindak Lanjut** di Detail Lead.
  2. Klik **+ Tambah Jadwal** (atau Jadwalkan Tindak Lanjut).
  3. Isi Subject: `Demo Presentasi Solusi ke Direksi`.
  4. Pilih Waktu: Besok jam 14.00 WIB.
  5. Pastikan checkbox **Sinkronkan Google Calendar** aktif (centang opsi "Sertakan info Lead/Sales di deskripsi").
  6. Klik Simpan.
  7. Buka Google Calendar tujuan sinkronisasi.
- **Expected Result:**
  - Event baru muncul di Google Calendar dengan judul dan waktu yang sesuai.
  - Deskripsi event memuat catatan agenda, nama sales pembuat, serta kode Lead.
  - Klik **Jadwal Ulang** di aplikasi dan ubah jamnya ➔ Event di Google Calendar terupdate jamnya.
  - Klik **Batalkan** di aplikasi ➔ Event di Google Calendar terhapus otomatis (`deleteEvent`).
- **Status:** PASS (Sudah terverifikasi pada logic controller & service).

---

### TC-08: Zoom Meeting Automation & Webhook Security
- **Test ID:** `TC-ZOOM-08`
- **Tujuan:** Menguji pembuatan tautan Zoom meeting instan dari agenda serta validasi keamanan webhook Zoom.
- **Akun Diperlukan:** `sales.a@activ.co.id` (memiliki lisensi Zoom aktif)
- **Langkah Pengujian:**
  1. **Pembuatan Link:**
     - Saat membuat jadwal, centang **Buat Tautan Zoom**.
     - Simpan jadwal.
     - *Expected:* Di kartu agenda muncul tautan `https://zoom.us/j/...` dan meeting ID.
  2. **Uji Keamanan Webhook Palsu (Negative Test):**
     - Kirim request POST cURL tanpa header signature Zoom:
       ```bash
       curl -X POST http://localhost:8000/webhooks/zoom \
         -H "Content-Type: application/json" \
         -d '{"event":"recording.completed","payload":{"object":{"id":"123","share_url":"https://fake.url"}}}'
       ```
     - *Expected (Pasca Hotfix P0-3):* Request ditolak dengan kode respon **401 Unauthorized**.
- **Status:** PASS untuk pembuatan Zoom link; PENDING PATCH untuk penolakan request tanpa signature (TC-ZOOM-SEC).

---

### TC-09: Sales Order Cost & Grand Total Calculation
- **Test ID:** `TC-SO-COST-09`
- **Tujuan:** Memvalidasi bahwa penambahan dan penghapusan biaya operasional (cost) pada Sales Order menghitung grand total dengan benar.
- **Akun Diperlukan:** `sales.a@activ.co.id` atau `manager@activ.co.id`
- **Data Dummy:**
  - Nilai Barang (Total Item Value): Rp 5.000.000
  - Biaya Tambahan 1: `Biaya Packing Kayu` (Rp 200.000)
  - Biaya Tambahan 2: `Ongkos Kirim Truk` (Rp 800.000)
- **Langkah Klik Pengujian (UI):**
  1. Buka Sales Order terkait.
  2. Pada tabel Biaya Tambahan (Cost), klik **+ Tambah Biaya**.
  3. Masukkan deskripsi `Biaya Packing Kayu`, nominal `200000`. Klik Simpan.
  4. Periksa ringkasan nilai:
     - Total Barang: Rp 5.000.000
     - Total Cost: Rp 200.000
     - Grand Total seharusnya: **Rp 5.200.000**
  5. Hapus biaya tersebut melalui tombol tempat sampah.
  6. Periksa kembali:
     - Grand Total harus kembali ke **Rp 5.000.000**.
- **Status:** PASS (setelah penerapan patch P0-2).

---

### TC-10: Smoke & Regression Test Suite
- **Test ID:** `TC-SMOKE-10`
- **Tujuan:** Memastikan fitur inti sistem tidak mengalami regresi setelah perubahan hotfix.
- **Checklist Alur:**
  - [ ] Login dengan email & password yang benar.
  - [ ] Navigasi menu utama: Dashboard, Lead Pipeline, Kalender, Quotations, Sales Orders, Customers, Products.
  - [ ] Buka halaman **Roles & Hak Akses**, periksa 3 dropdown Cakupan Data di kategori Lead Pipeline.
  - [ ] Buat 1 Quotation baru, cetak PDF / print preview.
  - [ ] Buka Team Calendar, buka modal Tambah Jadwal ➔ Pastikan modal dapat discroll dan tombol "Jadwalkan Kunjungan" tidak terpotong.
  - [ ] Logout akun.

---

## 3. Panduan Menjalankan Automated Test (Berdasarkan Konfigurasi Repository)

Untuk menjalankan automated test suite di komputer lokal:

### 1. Eksekusi Seluruh Test Suite (PHPUnit)
```powershell
php artisan test
```
*Expected Output:*
```text
PASS  Tests\Unit\QuotationCalculatorTest
PASS  Tests\Feature\LeadPipelineTest
PASS  Tests\Feature\CalendarPermissionTest
PASS  Tests\Feature\WorkflowTest
...
Tests:    106 passed (953 assertions)
Duration: ~6 - 8 seconds
```

### 2. Eksekusi Test Tertentu (Fokus Otorisasi & Kalender)
```powershell
# Uji permission dan akses kalender
php artisan test tests/Feature/CalendarPermissionTest.php

# Uji filter dan scope pipeline lead
php artisan test tests/Feature/LeadPipelineFilterTest.php

# Uji kalkulator finansial quotation
php artisan test tests/Unit/QuotationCalculatorTest.php
```

### 3. Pembersihan Cache dan Pengujian Ulang
```powershell
php artisan optimize:clear
php artisan test
```

