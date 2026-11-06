# Q-Sales Release Readiness & Deployment Checklist

**Document ID:** REL-QSALES-001  
**Project:** Q-Sales (ACTiV Sales Portal)  
**Target Publication:** November 2026 Release Candidate  
**Status:** Conditional GO (Ready after applying P0 Hotfix)

---

## 1. Go / No-Go Decision Criteria

Kriteria rilis Q-Sales ditentukan berdasarkan matrix berikut:

| Kriteria | Target | Kondisi Aktual | Status |
|---|---|---|---|
| Test Suite Passing | 100% PASS | 106 / 106 tests PASS (953 assertions) | ✅ MET |
| Frontend Production Build | Zero Syntax / Compile Errors | Vite build v8.2.2 sukses, assets minified | ✅ MET |
| Database Migration Safety | Idempotent & Zero Data Loss | Migrasi auto-merge duplikat customer aktif | ✅ MET |
| Core Quotation & PO Flow | Berjalan tanpa regresi | Berfungsi sesuai flow bisnis | ✅ MET |
| P0 Critical Fixes | Selesai & Terverifikasi | Memerlukan patch 4 item P0 sebelum publikasi publik | ⚠️ PENDING HOTFIX |

### Keputusan: **CONDITIONAL GO**
Aplikasi **sangat layak dan siap dipublikasikan** segera setelah 4 item P0 (Otorisasi Lead Stage/Destroy/PIC, SO Cost formula, dan Zoom Webhook signature check) diaplikasikan.

---

## 2. Checklist Kondisi Sebelum Publish (Pre-Release Checklist)

### A. Keamanan & Akses Data (P0 Blocker)
- [ ] Tambahkan otorisasi `WorkflowAccess::lead()` dan `canManage()` pada `LeadController::updateStage()` (BUG-001).
- [ ] Tambahkan otorisasi pada `LeadController::destroy()` (BUG-002).
- [ ] Tambahkan otorisasi pada `LeadController::storePic()` & `destroyPic()` (BUG-003).
- [ ] Tambahkan validasi header signature `x-zm-signature` pada event webhook Zoom (BUG-004).

### B. Integritas Finansial (P0 Blocker)
- [ ] Koreksi rumus penambahan biaya tambahan pada `SalesOrderController::storeCost()` dari `grand_total = totalItemVal` menjadi `grand_total = totalItemVal + totalCost` (BUG-009).

### C. Database & Migrasi Produksi
- [ ] Pastikan file migrasi `2026_11_03_043212_add_unique_name_to_customers_table.php` yang sudah diperbarui dengan logika auto-merge dijalankan di server production (`php artisan migrate`).
- [ ] Pastikan migrasi permission `2026_11_06_000000_add_lead_pipeline_scoped_permissions.php` telah dieksekusi agar hak akses Lead Pipeline (Cakupan Data) aktif di production.
- [ ] Jalankan `php artisan optimize:clear` di server.

### D. Tampilan & User Interface
- [x] Modal "Tambah Jadwal" di Team Calendar dan Detail Lead sudah responsif dengan container scrollable (`max-h-[90vh] overflow-y-auto`) dan tombol sticky di bawah.
- [x] Kategori Lead Pipeline pada menu **Roles & Hak Akses** sudah rapi menampilkan 3 baris fitur dengan dropdown select Cakupan Data (*Data sendiri*, *Data sendiri + BU*, *Semua data*).
- [x] Opsi "Sertakan info Lead/Sales di deskripsi" sudah terpasang pada modal sinkronisasi Google Calendar.
- [x] Posisi card "Proyek & Tindak Lanjut" dan "Catat Hasil Komunikasi" pada halaman Detail Lead sudah tertukar sesuai preferensi tata letak.

---

## 3. Risiko Residual yang Diterima (Accepted Residual Risks for Initial Release)

Risiko berikut **bukan blocker rilis awal** dan diterima untuk ditangani pada patch pasca-publikasi:

1. **One-Way Google Calendar Synchronization:**
   - *Kondisi:* Event kalender disinkronkan satu arah dari Q-Sales ke Google Calendar. Perubahan yang dilakukan manual langsung di Google Calendar tidak masuk kembali ke Q-Sales.
   - *Mitigasi Operasional:* Berikan panduan kepada tim sales agar seluruh update tanggal dan waktu agenda dilakukan melalui aplikasi Q-Sales.
2. **Ketiadaan Undangan Peserta Otomatis (Attendee Email):**
   - *Kondisi:* Google Service Account tanpa Domain-Wide Delegation menolak pengiriman email undangan peserta (403 error).
   - *Mitigasi Operasional:* Di UI sudah diberi badge jelas "Coming Soon", dan email peserta disalin secara otomatis ke dalam deskripsi event Google Calendar.
3. **Penyimpanan Kredensial SystemSetting Belum Terenkripsi (At-Rest):**
   - *Kondisi:* Kredensial tersimpan dalam JSON plain text di database.
   - *Mitigasi Operasional:* Akses database production cPanel dibatasi hanya untuk Super Admin (port DB tidak dibuka ke publik). Enkripsi at-rest dijadwalkan pada Wave 1 Patch.
4. **Volume Data Awal (Unpaginated Kanban):**
   - *Kondisi:* Kanban memuat seluruh lead aktif tanpa pagination.
   - *Mitigasi Operasional:* Pada fase awal rilis (lead < 500), performa masih sangat cepat (< 300ms). Pagination virtual akan diterapkan pada Wave 2 saat volume membesar.

---

## 4. Rencana Patch Pasca-Publikasi (Post-Release Backlog)

### Wave 1 Patch (1-2 Minggu Pasca Rilis)
1. **Multiple PO Display:** Memperbarui `LeadController::show()` dan `LeadDetail.jsx` agar menampilkan seluruh kartu PO yang terdaftar pada tabel `quotation_purchase_orders`.
2. **SO Notes Column:** Menambahkan migrasi kolom `notes` pada tabel `sales_orders` dan mendaftarkannya di `$fillable` model `SalesOrder`.
3. **Database Credentials Encryption:** Mengubah cast `SystemSetting` menjadi `'encrypted:json'` dan memigrasikan value kredensial lama.
4. **Zoom Webhook Replay Protection:** Menambahkan validasi timestamp toleransi 5 menit.

### Wave 2 Optimization (1-2 Bulan Pasca Rilis)
1. **Combobox Async Loading:** Memindahkan pemilihan Customer & PIC pada modal Add Lead dari eager-load menjadi search on-demand.
2. **Kanban Stage Pagination:** Menambahkan cursor/limit per stage kanban.
3. **Google OAuth 2.0 User-Level Delegation:** Migrasi integrasi kalender dari Service Account ke OAuth user consent untuk membuka fitur attendee invitations.

---

## 5. Prosedur Deployment Standar ke Server cPanel

Jalankan perintah berikut di terminal cPanel saat deploy pembaruan:

```bash
# 1. Tarik pembaruan kode dari branch main
git pull origin main

# 2. Jalankan migrasi database
php artisan migrate --force

# 3. Bersihkan dan perbarui cache aplikasi
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Verifikasi status aplikasi
php artisan status
```

