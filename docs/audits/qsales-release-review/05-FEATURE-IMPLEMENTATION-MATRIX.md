# Q-Sales Feature Implementation Matrix

**Document ID:** MAT-QSALES-001  
**Project:** Q-Sales (ACTiV Sales Portal)  
**Terakhir Diperiksa:** 6 November 2026 (Commit `2f4c83d`)  
**Klasifikasi Status:**
- **Lengkap & Teruji:** Kode lengkap, terhubung ke DB/UI, dan lulus verifikasi/pengujian.
- **Parsial:** Kode backend tersedia namun integrasi UI terbatas, atau memiliki keterbatasan teknis tertentu.
- **Belum Diimplementasikan:** Rencana fitur belum memiliki implementasi di controller/model.
- **Dalam Roadmap / Coming Soon:** Ditandai sengaja untuk rilis berikutnya.

---

## 1. Matriks Modul Utama

| Modul / Fitur | Sub-Fitur | Status Implementasi | Status Pengujian | Keterangan & Batasan Teknis |
|---|---|---|---|---|
| **Lead 360°** | Pembuatan Lead & PIC | Lengkap & Teruji | PASS (TC-01) | Mendukung single customer & multiple PIC per lead |
| | Kanban Board & Stage Flow | Lengkap & Teruji | PASS (TC-01) | Drag-and-drop dinamis berdasarkan setting pipeline |
| | Auto-Convert ke Customer saat Deal | Lengkap & Teruji | PASS | Otomatis membuat ID Customer jika lead belum berelasi |
| | Quick Log Communication Bar | Lengkap & Teruji | PASS (TC-04) | Catat respon (telepon, WA, meeting, catatan) |
| | Activity Timeline Grouping | Lengkap & Teruji | PASS (TC-04) | Pengelompokan aktivitas berdasarkan tanggal |
| | Otorisasi Update Stage & Destroy | **Parsial (Perlu Patch P0)** | PENDING HOTFIX | Memerlukan penambahan `WorkflowAccess::canManage()` |
| **Quotation** | Pembuatan Penawaran Multi-Item | Lengkap & Teruji | PASS (TC-02) | Kalkulator PPN, diskon, margin server-authoritative |
| | Penautan Lead ke Quotation | Lengkap & Teruji | PASS (TC-02) | Quotation dapat dibuat dari Lead atau ditautkan belakangan |
| | Split Sub-Quotation | Lengkap & Teruji | PASS | Alokasi parsial item ke sub-quotation terpisah |
| | Alur Revisi & Approval | Lengkap & Teruji | PASS (TC-02) | Quotation status approved terkunci otomatis |
| | Cetak Dokumen PDF / Print | Lengkap & Teruji | PASS | Template print resmi dengan kop dan rekening perusahaan |
| **Purchase Order (PO)** | Pencatatan Nomor & Tanggal PO | Lengkap & Teruji | PASS (TC-03) | Menyimpan data PO flat pada quotation |
| | Upload Dokumen PO | Lengkap & Teruji | PASS (TC-03) | Upload file PDF/Gambar ke local/public storage |
| | Relasi Multi-PO per Quotation | **Parsial** | PARTIAL | Model & tabel `quotation_purchase_orders` siap, namun UI Lead Detail baru membaca PO pertama |
| **Sales Order (SO)** | Auto-Generate SO dari Approved PO | Lengkap & Teruji | PASS (TC-03) | Terbentuk otomatis dengan kode `SO.[ID_QUOTATION]` |
| | Penambahan Biaya Tambahan (Cost) | **Parsial (Perlu Patch P0)** | PENDING HOTFIX | Formula grand total pada `storeCost` perlu dikoreksi |
| | Simpan Catatan (Notes) SO | **Parsial** | PENDING P1 | Field notes diabaikan karena belum ada kolom di DB |
| | Update Status SO | Lengkap & Teruji | PASS | Status progres SO tersimpan dan memicu notifikasi |
| **Smart Visit & Agenda** | Jadwalkan Kunjungan dari Lead | Lengkap & Teruji | PASS (TC-07) | Terhubung ke kalender dan lead activity |
| | Kegiatan Seharian (All-Day) / Multi-Hari | Lengkap & Teruji | PASS (TC-07) | Dukungan rentang tanggal multi-hari |
| | Check-in / Selesai Kunjungan | Lengkap & Teruji | PASS | Mencatat timestamp selesai dan hasil kunjungan |
| | Pembatalan Jadwal | Lengkap & Teruji | PASS (TC-07) | Menghapus event internal dan Google Calendar |
| **Google Calendar** | Push Jadwal ke Kalender Tim | Lengkap & Teruji | PASS (TC-07) | Menggunakan Service Account JWT HTTP client |
| | Sinkronisasi Edit / Reschedule | Lengkap & Teruji | PASS (TC-07) | Memperbarui waktu dan deskripsi di Google Calendar |
| | Opsi Sertakan Info Lead/Sales | Lengkap & Teruji | PASS (TC-07) | Toggle deskripsi agenda di modal form |
| | Undangan Peserta (Attendee Email) | **Coming Soon** | LIMITATION | Dibatasi API Service Account Google (menunggu OAuth v2) |
| | Sinkronisasi Dua Arah (Inbound Webhook)| **Belum Diimplementasikan**| OUT OF SCOPE | Sistem didesain satu arah (outbound push) |
| **Zoom Meeting** | Auto-Generate Instant Meeting Link | Lengkap & Teruji | PASS (TC-08) | Menggunakan Zoom Server-to-Server OAuth |
| | Tautan Meeting di Card Agenda | Lengkap & Teruji | PASS (TC-08) | Tombol Zoom disembunyikan jika agenda selesai/batal |
| | Cloud Recording Link via Webhook | Lengkap & Teruji | PASS (TC-08) | Menerima event `recording.completed` dan catat ke timeline |
| | Verifikasi Signature Webhook | **Parsial (Perlu Patch P0)** | PENDING HOTFIX | Memerlukan validasi header `x-zm-signature` |
| **Team Calendar** | Tampilan Kalender Bulanan Tim | Lengkap & Teruji | PASS | Menampilkan event seluruh sales sesuai cakupan data |
| | Multi-Day Bar Event Rendering | Lengkap & Teruji | PASS | Baris event multi-hari tampil berkesinambungan |
| | Modal Tambah Jadwal Responsif | Lengkap & Teruji | PASS | Modal scrollable dengan tombol sticky di bawah |
| **Roles & Permissions**| Matriks Izin Fitur & Aksi | Lengkap & Teruji | PASS | Menggunakan `spatie/laravel-permission` |
| | Dropdown Cakupan Data Lead Pipeline | Lengkap & Teruji | PASS | 3 Fitur memiliki select: Data sendiri, BU, Semua data |
| | Isolasi Data Antar Sales & BU | Lengkap & Teruji | PASS (TC-05) | Diproteksi service `DocumentVisibility` & `WorkflowAccess` |

---

## 2. Rangkuman Kesiapan Per Modul

```text
Lead Pipeline & 360°      [██████████████████░░] 90% (Siap rilis, butuh hotfix otorisasi)
Quotation & Revisi        [████████████████████] 100% (Sangat stabil)
PO & Sales Order          [█████████████████░░░] 85% (Siap rilis, butuh koreksi storeCost)
Smart Visit & Team Cal    [████████████████████] 100% (Selesai dan teruji)
Google Calendar (Outbound)[██████████████████░░] 90% (Selesai satu arah, attendee coming soon)
Zoom Meeting Integrations [████████████████░░░░] 80% (Selesai, butuh webhook signature check)
Roles & Data Visibility   [████████████████████] 100% (Selesai dan rapi)
```

