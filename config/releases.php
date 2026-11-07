<?php

return [
    'current_version' => 'v2.4.0',
    'last_updated' => '2026-11-07',
    'releases' => [
        [
            'version' => 'v2.4.0',
            'week' => '2026 - Minggu ke-45 (02 Nov - 08 Nov 2026)',
            'date' => '2026-11-07',
            'is_current' => true,
            'tag' => 'Major Feature Update',
            'summary' => 'Peluncuran Ekosistem Lead Pipeline 360, Integrasi Google Calendar & Zoom, Manajemen Multi-PIC, Export PPTX, dan Peningkatan Workflow Quotation.',
            'highlights' => [
                'Lead Pipeline Kanban Board dinamis dengan custom stages, colors, dan perhitungan nilai deal otomatis.',
                'Hubungkan Quotation ke Lead dengan modal modern 2-tab (Buat Baru / Pilih Ada), lengkap dengan filter "Tanpa Lead".',
                'Integrasi Google Calendar (Sync event & invite attendees PIC) & Zoom Meeting generator instan.',
                'Export Report Presentasi PPTX profesional bertema hijau Qsales dari Pipeline.',
                'Fitur rincian Other COGS SO (tanggal pengeluaran, lampiran dokumen per biaya) & Notifikasi Email Finance otomatis saat status Paid/Batal.',
                'Default Sales per Business Unit (BU) & Scope hak akses data (Own, BU, All).',
            ],
            'categories' => [
                'Lead & Pipeline' => [
                    'Papan Kanban interaktif dengan drag-and-drop dan deteksi status deal (Lost, Won, Terbayar).',
                    'Alasan Lost (Lost Reason) ditampilkan transparan di card kanban dan detail lead.',
                    'Lead 360 Cockpit: tab Timeline komunikasi, riwayat Quotation terkait, PO/SO, riwayat Visit, dan PIC.',
                    'Dukungan Multi-PIC per Customer dengan kemampuan tambah, edit, dan hapus kontak langsung.',
                ],
                'Quotation & Workflow' => [
                    'Modal "Hubungkan ke Lead" baru dengan navigasi tab ✨ Buat Lead Baru & 🔗 Pilih Lead Ada.',
                    'Tombol "Jadwalkan Tindak Lanjut" tetap aktif & tersedia baik saat quotation sudah atau belum terhubung.',
                    'Tab dan filter khusus "Tanpa Lead" di tabel Quotations agar penawaran tidak terlewat.',
                    'Default Sales otomatis terisi saat memilih Business Unit (BU) pada form Quotation.',
                ],
                'Integrasi & Kalender' => [
                    'Sinkronisasi dua arah ke Google Calendar internal perusahaan.',
                    'Integrasi Zoom Server-to-Server untuk generate link meeting otomatis saat menjadwalkan agenda.',
                    'Halaman Team Calendar terpusat dengan filter anggota tim dan scope Business Unit.',
                ],
                'Sales Order & Finance' => [
                    'Fitur rincian biaya operasional (Other COGS) lengkap dengan tanggal dan upload file bukti pembayaran.',
                    'Email notifikasi otomatis dikirim ke tim Finance saat Lead mencapai stage Terbayar (Paid) atau dibatalkan.',
                ],
            ],
        ],
        [
            'version' => 'v2.3.0',
            'week' => '2026 - Minggu ke-44 (26 Okt - 01 Nov 2026)',
            'date' => '2026-10-30',
            'is_current' => false,
            'tag' => 'Performance & Catalog',
            'summary' => 'Optimasi Performa Katalog Produk, SEO Friendly Slug Routing, dan Perbaikan Sinkronisasi Database.',
            'highlights' => [
                'Implementasi Product Slug route binding dengan fallback otomatis ke SKU untuk URL yang lebih rapi dan aman.',
                'Artisan command `products:sync-slugs` menggunakan database cursor untuk migrasi ribuan produk tanpa memory spike.',
                'Sanitasi karakter unik SKU pada saat impor dan pembacaan katalog.',
            ],
            'categories' => [
                'Produk & Katalog' => [
                    'Route model binding berbasis slug nama produk.',
                    'Pencegahan skipping data menggunakan cursor generator pada proses batch sync.',
                    'Validasi dan pembersihan karakter non-standar pada SKU.',
                ],
            ],
        ],
        [
            'version' => 'v2.2.0',
            'week' => '2026 - Minggu ke-43 (19 Okt - 25 Okt 2026)',
            'date' => '2026-10-22',
            'is_current' => false,
            'tag' => 'UI Redesign & Dashboard',
            'summary' => 'Redesain Halaman Customer Detail, Integrasi PO Status Tabs, dan Pembaruan Dashboard KPI.',
            'highlights' => [
                'Redesain halaman Customer Detail dengan visual premium gradient hero, KPI warna-warni, serta tab riwayat Quotation & Sales Order.',
                'Daftar Top Customer di dashboard utama kini dapat diklik langsung untuk menuju detail customer.',
                'Tab filter status PO pada daftar Sales Orders dan filter penugasan Sales.',
                'Deteksi status PO dibuat case-insensitive dengan kalkulasi fallback di frontend.',
            ],
            'categories' => [
                'Customer CRM' => [
                    'Tampilan modern Customer Detail dengan statistik total belanja, deal aktif, dan kontak utama.',
                    'Akses cepat dari dashboard widget langsung ke profil customer terkait.',
                ],
                'Sales Orders & Dashboard' => [
                    'Tabs pengelompokan PO di Sales Order memudahkan pemantauan pesanan yang belum terbit.',
                    'Perbaikan query referensi created_by pada kalkulasi target penjualan sales.',
                ],
            ],
        ],
        [
            'version' => 'v2.1.0',
            'week' => '2026 - Minggu ke-42 (12 Okt - 18 Okt 2026)',
            'date' => '2026-10-15',
            'is_current' => false,
            'tag' => 'Workflow & Permissions',
            'summary' => 'Migrasi Template Syarat & Ketentuan (Terms), Alur PO Quotation, dan Izin Impor Legacy.',
            'highlights' => [
                'Penambahan hak akses (permission) impor quotation legacy untuk tim Sales.',
                'Penyempurnaan alur perubahan status Quotation menjadi Purchase Order (PO).',
                'Migrasi otomatis template syarat & ketentuan lama langsung di halaman editor penawaran.',
                'Penyajian rincian margin item per produk pada modul Sales Orders.',
            ],
            'categories' => [
                'Quotation & Terms' => [
                    'Tombol migrasi terms legacy interaktif dengan fallback pemeliharaan format dokumen.',
                    'Perbaikan panjang index template terms untuk stabilitas database.',
                ],
                'Sales Order' => [
                    'Visibilitas margin per item barang saat memproses SO.',
                    'Proteksi penyimpanan input biaya tambahan (other COGS) agar tidak hilang saat reload.',
                ],
            ],
        ],
        [
            'version' => 'v2.0.0',
            'week' => '2026 - Minggu ke-37 (07 Sep - 13 Sep 2026)',
            'date' => '2026-09-08',
            'is_current' => false,
            'tag' => 'Major Release - Advanced Tools',
            'summary' => 'Fitur Duplikasi Quotation, Drag-and-Drop Reorder Produk, Ekspor Excel Analisa Margin SO, dan Dockerisasi.',
            'highlights' => [
                'Fitur 1-Click Duplicate Quotation untuk mempercepat pembuatan revisi atau penawaran serupa.',
                'Drag-and-Drop interaktif untuk mengatur urutan baris produk pada Quotation & Sales Order.',
                'Template Export Excel komprehensif untuk analisa margin Sales Order.',
                'Kalkulasi diskon distributor otomatis saat mengubah HPP di modal produk.',
                'Konfigurasi Docker lingkungan container lengkap dengan port 8000 dan ekstensi GD.',
            ],
            'categories' => [
                'Quotation Tools' => [
                    'Fitur duplikat quotation menyalin seluruh line item, terms, dan customer.',
                    'Drag-and-drop item tabel penawaran dengan reorder instan.',
                    'Auto calculate diskon distributor berdasarkan HPP & harga publish.',
                ],
                'Sales Order & Export' => [
                    'Penyelarasan label Simulasi SO menjadi Sales Order (SO).',
                    'Export template Excel laporan analisa laba kotor / margin SO.',
                ],
            ],
        ],
        [
            'version' => 'v1.3.0',
            'week' => '2026 - Minggu ke-36 (31 Agu - 06 Sep 2026)',
            'date' => '2026-09-02',
            'is_current' => false,
            'tag' => 'Sales Tools & Finance',
            'summary' => 'Sales Zone Internal Margin Calculator, Input Mata Uang Interaktif, dan Perbaikan Layout Tabel.',
            'highlights' => [
                'Kalkulator Sales Zone dengan simulasi internal margin, cashback, dan skenario komisi.',
                'Komponen EditableCurrencyInput: format otomatis rupiah (IDR) real-time saat mengetik angka.',
                'Kolom tabel Quotations kini dapat di-resize (drag lebar kolom) sesuai kebutuhan layar.',
                'Optimasi CSS PDF print agar tidak overflow saat dicetak atau diunduh.',
            ],
            'categories' => [
                'Kalkulator & Input' => [
                    'Sales Zone margin calculator untuk mengecek kelayakan diskon penawaran.',
                    'Komponen input nominal rupiah dengan separator titik otomatis.',
                ],
                'UI & Printing' => [
                    'Resizable column table untuk kenyamanan membaca dokumen panjang.',
                    'Perbaikan layout cetak PDF formal ukuran A4.',
                ],
            ],
        ],
        [
            'version' => 'v1.2.0',
            'week' => '2026 - Minggu ke-35 (24 Agu - 30 Agu 2026)',
            'date' => '2026-08-31',
            'is_current' => false,
            'tag' => 'Product Management',
            'summary' => 'Peningkatan Katalog Produk, Alur Lupa Password, dan Konfigurasi Logo Berbasis Domain.',
            'highlights' => [
                'Tampilan default katalog produk dalam mode tabel list yang cepat dengan fitur pagination dan search akurat.',
                'Fitur Lupa Password (Forgot Password) melalui email verifikasi.',
                'Dukungan multi-domain: logo aplikasi menyesuaikan nama domain/instansi yang mengakses.',
            ],
            'categories' => [
                'Katalog' => [
                    'Ekspor data katalog produk dan filter per brand.',
                    'Pencarian produk berbasis SKU dan deskripsi akurat.',
                ],
                'Otentikasi & Branding' => [
                    'Self-service reset password bagi pengguna.',
                    'Mapping logo dan identitas perusahaan dinamis.',
                ],
            ],
        ],
        [
            'version' => 'v1.1.0',
            'week' => '2026 - Minggu ke-33 (10 Agu - 16 Agu 2026)',
            'date' => '2026-08-13',
            'is_current' => false,
            'tag' => 'Notification & Activity',
            'summary' => 'Pusat Notifikasi Interaktif, Riwayat Aktivitas (Activity Logs), Perhitungan PPh, dan Business Unit (BU).',
            'highlights' => [
                'Lonceng notifikasi real-time di Topbar dengan penanda dibaca dan penghapusan riwayat.',
                'Pencatatan Activity Log untuk setiap tindakan quotation (create, send, approval, status change).',
                'Kalkulasi otomatis PPh 23 dan opsi pembulatan nilai penawaran.',
                'Struktur Business Unit (BU): penomoran quotation otomatis dengan kode sales & pembagian data per BU.',
            ],
            'categories' => [
                'Notifikasi & Log' => [
                    'Notification bell dengan counter unread dan popup riwayat pesan.',
                    'Audit trail aktivitas penawaran harga.',
                ],
                'Struktur Organisasi & Pajak' => [
                    'Manajemen Business Unit (BU) dan prefix nomor dokumen.',
                    'Perhitungan pajak penghasilan PPh 23 pada simulasi penawaran.',
                ],
            ],
        ],
        [
            'version' => 'v1.0.0',
            'week' => '2026 - Minggu ke-32 (03 Agu - 09 Agu 2026)',
            'date' => '2026-08-08',
            'is_current' => false,
            'tag' => 'Initial Foundation',
            'summary' => 'Peluncuran Perdana Portal Penjualan ACTiV (Qsales).',
            'highlights' => [
                'Pembuatan dan pengelolaan penawaran harga (Quotation) profesional.',
                'Cetak PDF Quotation berstandar resmi bahasa Indonesia dan Inggris.',
                'Master Terms & Conditions serta template personal sales.',
                'Sistem manajemen pengguna dengan Role Administrator, Sales, Manager, dan Finance.',
            ],
            'categories' => [
                'Core Sales' => [
                    'Mesin kalkulasi harga, diskon, PPN 11%, dan grand total.',
                    'Export PDF resmi dengan kop surat PT Alfa Cipta Teknologi Virtual.',
                ],
                'Keamanan & Manajemen' => [
                    'Autentikasi aman berbasis Spatie Role & Permission.',
                    'Pengaturan rekening bank perusahaan dan master data.',
                ],
            ],
        ],
    ],
];
