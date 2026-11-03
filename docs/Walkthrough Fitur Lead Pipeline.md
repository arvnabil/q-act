# 📖 Walkthrough Lengkap: Fitur Lead Pipeline & Lead 360° — Q-Sales (ACTiV)

Dokumen ini berisi panduan komprehensif, arsitektur data, dan dokumentasi operasional untuk seluruh pembaruan **Fitur Lead Pipeline, Timeline Aktivitas, Integrasi Quotation (Lead 360° Phase 1), serta Pembersihan Duplikasi Customer** pada sistem **Q-Sales (ACTiV)**.

---

## 📑 Daftar Isi

1. [Arsitektur & Konsep Lead 360°](#1-arsitektur--konsep-lead-360)
2. [Pencegahan & Penggabungan Duplikasi Customer (Deduplication)](#2-pencegahan--penggabungan-duplikasi-customer-deduplication)
3. [Pipeline Board (Kanban & List View)](#3-pipeline-board-kanban--list-view)
4. [Detail Lead & Timeline Aktivitas Interaktif](#4-detail-lead--timeline-aktivitas-interaktif)
5. [Integrasi Lead ⇄ Quotation (Phase 1)](#5-integrasi-lead--quotation-phase-1)
6. [Smart Visit & Follow-up (Kunjungan Lapangan)](#6-smart-visit--follow-up-kunjungan-lapangan)
7. [Daftar Yang Sudah Dikerjakan (Completed)](#7-daftar-yang-sudah-dikerjakan-completed)
8. [Daftar Yang Belum Dikerjakan (Pending Roadmap)](#8-daftar-yang-belum-dikerjakan-pending-roadmap)

---

## 1. Arsitektur & Konsep Lead 360°

Fitur Lead berfungsi sebagai **Cockpit Komersial** terpadu bagi tim sales. Siklus hidup prospek terhubung langsung dengan Customer, Aktivitas Lapangan, Penawaran (Quotation), hingga Sales Order (SO).

```mermaid
flowchart TD
    L["🌱 Lead (Prospek)"] -->|"Pilih / Auto-create"| C["🏢 Customer"]
    L -->|"Quick Log / Observer"| T["📋 Timeline Aktivitas\n(Catatan, Call, WA, Email, Meeting)"]
    L -->|"Jadwalkan Kunjungan"| V["📍 Visit & Follow-up\n(Check-in GPS, Smart Customer)"]
    L -->|"1 Lead to Many"| Q["📄 Quotations (Penawaran)\n(Q.MMYY.SEQ - Nomor Tidak Berubah)"]
    Q -->|"PO Diterima"| SO["📦 Sales Order"]
    L -.->|"Future Integration"| GC["🗓️ Google Calendar Tim"]
    L -.->|"Future Integration"| ZM["🎥 Zoom Meeting & Notes"]
```

---

## 2. Pencegahan & Penggabungan Duplikasi Customer (Deduplication)

Untuk menjamin integritas data (tidak ada nama PT ganda seperti *ExxonMobil* atau *FWD Insurance*):

### A. Proteksi Database & Validasi
* **Database Migration**: Index unik `customers_name_unique` pada kolom `customers.name`.
* **Backend Validation**:
  - `CustomerController::store()`: `'name' => 'required|string|max:255|unique:customers,name'`
  - `CustomerController::update()`: `'name' => 'required|string|max:255|unique:customers,name,' . $customer->id`

### B. Otomatisasi CLI Merger untuk cPanel / Production
Perintah artisan khusus untuk memindai dan menggabungkan data ganda tanpa menghilangkan relasi Quotation atau SO:
```bash
# Simulasi pengecekan duplikat tanpa mengubah database:
php artisan customers:merge-duplicates --dry-run

# Eksekusi penggabungan otomatis:
php artisan customers:merge-duplicates --force
```
*Aturan Merge:* Customer tertua dipertahankan (**KEEP**), PIC dipindahkan (duplikat email dibersihkan), seluruh Quotation, Sales Order, dan Lead dialihkan ke ID yang dipertahankan, lalu data duplikat dihapus (**REMOVE**).

### C. Antarmuka UI (Khusus Administrator & Sales Manager)
* Tombol **"Gabung Duplikat"** pada halaman `/customers` (ikon git-merge amber).
* Membuka modal pemindai real-time yang menampilkan grup nama kembar, perbandingan jumlah transaksi/PIC, dan tombol 1-klik gabung.

---

## 3. Pipeline Board (Kanban & List View)

URL: `/leads`

* **Dynamic Header Cards**: Menampilkan Total Lead, 2 kartu pilihan dinamis (default: *Hot Progress* & *Proyek Deal* dengan dropdown switcher langsung di kartu), dan Total Estimasi Nilai.
* **Full-Height Responsive Kanban**: Mengisi viewport layar tanpa terpotong dengan slider navigasi horizontal atas.
* **Silent Background Drag & Drop**: Menggeser kartu antar stage menggunakan Axios background AJAX tanpa reload halaman dan tanpa memicu progress bar Inertia.
* **Auto Customer Conversion**: Ketika lead digeser ke tahap `proyek_deal`, jika lead belum memiliki `customer_id`, sistem otomatis mendaftarkan perusahaan menjadi Customer baru.

---

## 4. Detail Lead & Timeline Aktivitas Interaktif

URL: `/leads/{lead}`

### A. Quick Log Bar (Tanpa Pop-up Modal)
Sales dapat langsung merekam aktivitas harian secara instan melalui 5 tombol aksi:
* 📝 **Catatan** (`note`): Catatan internal atau progress proyek.
* 📞 **Log Telepon** (`call`): Ringkasan panggilan telepon dengan customer.
* 💬 **Log WhatsApp** (`whatsapp`): Ringkasan percakapan chat/WA.
* 📧 **Log Email** (`email`): Notulen korespondensi email.
* 🎥 **Meeting** (`meeting`): Hasil meeting tatap muka atau video conference.

### B. Inline Editing & Hover Actions
* **Edit Cepat**: Arahkan kursor ke item aktivitas → klik ✏️ → form edit inline menggantikan item tanpa pop-up.
* **Hapus Aman**: Klik 🗑️ dengan konfirmasi.
* **System Safeguard**: Aktivitas yang dibuat oleh sistem (`stage_change`, `quotation_linked`, `deal_won`, `deal_lost`) tidak dapat diedit atau dihapus secara manual.

### C. Timeline Grouping by Date
Aktivitas dikelompokkan berdasarkan tanggal kejadian:
* **Hari ini**
* **Kemarin**
* **Tanggal lengkap (contoh: 3 November 2026)**

---

## 5. Integrasi Lead ⇄ Quotation (Phase 1)

### A. Skema Relasi Database
* Kolom `quotations.lead_id` (`UUID`, nullable, foreign key ke `leads.id`).
* Relasi Eloquent:
  - `Lead::quotations()` -> `hasMany(Quotation::class, 'lead_id')`
  - `Quotation::lead()` -> `belongsTo(Lead::class, 'lead_id')`
* **Format Penomoran Quotation**: Standar `{CODE}.{MMYY}.{SEQ}` (contoh: `Q.1126.001`) tetap dipertahankan 100%.

### B. Pembuatan Quotation dari Lead
1. Di halaman **Lead Detail**, terdapat tombol **`+ Buat Quotation`** di header dan di card Quotation.
2. Mengarahkan ke `/quotations/create?lead_id={lead_id}&customer_id={customer_id}`.
3. Form pembuatan Quotation otomatis mengunci Lead dan mengisi Customer serta PIC terkait.
4. Begitu Quotation tersimpan, sistem otomatis mencatat aktivitas pada timeline Lead:
   > *"Quotation dibuat: Q.1126.001 dan terhubung ke lead ini."*

### C. Card Quotation di Lead Detail
Sidebar menampilkan card **Quotation ({count})** yang merangkum:
* Nomor Quotation (`Q.xxxx`)
* Label revisi jika ada (`Rev 1`, `Rev 2`)
* Nominal Grand Total terformat (`Rp xx.xxx.xxx`)
* Status dokumen (`created`, `sent`, `approved`, dll.)
* Link satu klik menuju halaman detail Quotation.

---

## 6. Smart Visit & Follow-up (Kunjungan Lapangan)

URL: `/leads/visits`

Menyelesaikan kendala formulir yang membingungkan ketika Lead sudah memiliki data Customer:
* **Otomatisasi Customer**: Saat Sales memilih **Lead**, dropdown Customer otomatis **disembunyikan** dan digantikan informasi ringkas:
  > *"Customer otomatis dari Lead: PT. ExxonMobil"* (dengan tombol kecil *"Ubah"* jika ingin override).
* **Kunjungan Langsung**: Jika tidak memilih Lead, form tetap ringkas dengan link toggle:
  > *`+ Kunjungan langsung ke Customer (tanpa Lead)`*
* **Fallback Backend**: Jika request menyimpan kunjungan dengan `lead_id` tanpa `customer_id`, backend otomatis mengambil `customer_id` dari data Lead terkait.

---

## 7. Daftar Yang Sudah Dikerjakan (Completed)

| Fitur / Komponen | Status | Catatan Teknis |
|---|---|---|
| **Merge Customer Duplikat** | ✅ Selesai | Script CLI & migration selesai dijalankan, 0 duplikat tersisa |
| **Unique Constraint Customer Name** | ✅ Selesai | Index unik `customers_name_unique` aktif di DB & validasi controller |
| **Admin UI Gabung Duplikat** | ✅ Selesai | Modal scan & merge 1-klik di `/customers` (Role Admin/Manager) |
| **Artisan Command CLI** | ✅ Selesai | `php artisan customers:merge-duplicates` siap untuk deploy cPanel |
| **Kanban Pipeline Board** | ✅ Selesai | Drag-and-drop silent AJAX, dynamic header cards, scroll controller |
| **Quick Log Bar Lead Timeline** | ✅ Selesai | 5 tipe aktivitas: Catatan, Call, WA, Email, Meeting |
| **Inline Edit/Delete Activity** | ✅ Selesai | Role/ownership guard, system activity protection |
| **Date Grouping Timeline** | ✅ Selesai | Grouping "Hari ini", "Kemarin", "Tanggal" |
| **Migration `quotations.lead_id`** | ✅ Selesai | Kolom UUID nullable aktif dengan foreign key |
| **Migration `lead_pics`** | ✅ Selesai | Tabel pivot PIC level lead dengan role context aktif |
| **Prefill Lead di Buat Quotation** | ✅ Selesai | Param `?lead_id=` auto-select lead & customer di `QuotationCreate.jsx` |
| **Dropdown Lead di Buat Quotation** | ✅ Selesai | Sales bisa menghubungkan penawaran baru ke Lead manapun |
| **Quotation Card di Lead Detail** | ✅ Selesai | Daftar quotation terhubung, status, revisi, dan total rupiah |
| **Backlink di Detail Quotation** | ✅ Selesai | Banner terhubung ke Lead di `QuotationDetail.jsx` dengan link 1-klik |
| **Lead 360° Cockpit Tab System** | ✅ Selesai | 5 Tab interaktif di `LeadDetail`: Timeline, Quotation, PO & SO, Kunjungan, PIC |
| **Multi-PIC Management (`lead_pics`)**| ✅ Selesai | Modal tambah PIC dari Customer/lapangan, role badge, tombol WA/Telp/Email, unlink |
| **PO & Sales Order Tracker Tab** | ✅ Selesai | Tracking nomor PO customer & Sales Order yang terbit dari penawaran lead |
| **Smart Visit Customer Selection** | ✅ Selesai | Auto-hide dropdown customer jika lead dipilih, toggle link direct |
| **Terminologi Standar** | ✅ Selesai | Menggunakan label "Quotation" / "Quot", bukan "SPH" |
| **Standardisasi Toast Notification** | ✅ Selesai | Global white card style `#ffffff` dengan aksen teal `#009680` |
| **Google Calendar Shared Integration** | ✅ Selesai | Service Account JWT sync, auto create/update/delete event kantor |
| **Zoom Server-to-Server OAuth** | ✅ Selesai | Auto create Zoom meeting, 1-klik Join Zoom, inject link ke G-Cal & Timeline |
| **Halaman Kalender Tim (`/team-calendar`)** | ✅ Selesai | Visual kalender bulanan terpadu seluruh jadwal kunjungan & meeting sales |
| **Pengaturan Integrasi di Settings** | ✅ Selesai | Form kredensial Google Calendar & Zoom, matriks lisensi Zoom & email tim |

---

## 8. Panduan Integrasi Google Calendar & Zoom Server-to-Server

### A. Integrasi Google Calendar (Shared Company Calendar)
1. Buka menu **Settings** (`/settings`) pada section **Integrasi Eksternal**.
2. Masukkan **Calendar ID** (misal: `calendar@activ.co.id` atau ID kalender khusus di Google Calendar Settings).
3. Paste isi file **Service Account JSON** dari Google Cloud Console.
4. **PENTING**: Invite email service account tersebut ke kalender Google kantor dengan izin *"Make changes to events"*.
5. Setiap kali sales menjadwalkan kunjungan di Lead atau menu Visit, event otomatis terbit di kalender bersama dan muncul di handphone seluruh tim sales.

### B. Integrasi Zoom Server-to-Server OAuth
1. Buka **marketplace.zoom.us** → *Develop* → *Build App* → pilih **Server-to-Server OAuth**.
2. Aktifkan scopes: `meeting:write:admin` dan `meeting:read:admin`.
3. Salin **Account ID**, **Client ID**, dan **Client Secret** ke form Zoom di menu **Settings**.
4. Centang checklist **Lisensi Zoom** untuk sales yang berhak membuat meeting pada tabel anggota tim.
5. Saat membuat kunjungan dengan tipe Demo/Presentasi, opsi "Buat Link Zoom Meeting Otomatis" otomatis aktif dan menghasilkan link meeting instan.

### C. Halaman Kalender Tim (`/team-calendar`)
- Akses via menu sidebar: **Lead Pipeline → Kalender Tim** (atau tombol di halaman Visit & Lead Detail).
- Menampilkan grid bulanan dengan indikator warna per jenis kunjungan (Visit, Follow-up, Demo, Presentasi).
- Klik tanggal manapun untuk langsung menjadwalkan kunjungan baru.
- Klik event untuk melihat detail agenda, customer, link lead, status check-in, dan tombol 1-klik masuk Zoom.

---

## 9. Prosedur Deploy ke cPanel Production
Saat melakukan rilis ke server production cPanel, lakukan urutan berikut:
```bash
# 1. Jalankan merger duplikasi SEBELUM migrate (PENTING):
php artisan customers:merge-duplicates --force

# 2. Baru jalankan migration database:
php artisan migrate

# 3. Build assets (atau upload folder public/build hasil lokal):
bun run build
```
