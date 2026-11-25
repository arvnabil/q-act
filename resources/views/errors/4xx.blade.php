@php
    $status = $exception->getStatusCode();
    [$eyebrow, $title, $description] = match ($status) {
        400 => ['Permintaan tidak valid', 'Permintaan belum bisa diproses', 'Periksa kembali informasi yang dikirim, lalu coba lagi.'],
        401 => ['Perlu masuk', 'Silakan masuk ke QSales', 'Sesi Anda perlu diautentikasi sebelum halaman ini dapat dibuka.'],
        403 => ['Akses dibatasi', 'Anda belum memiliki akses ke halaman ini', 'Jika Anda merasa seharusnya bisa membuka halaman ini, hubungi Administrator QSales.'],
        404 => ['Halaman tidak ditemukan', 'Halaman ini tidak tersedia', 'Tautan mungkin sudah berubah atau halaman telah dipindahkan.'],
        408 => ['Waktu permintaan habis', 'Permintaan terlalu lama', 'Periksa koneksi Anda, lalu coba buka halaman kembali.'],
        409 => ['Terjadi konflik', 'Data berubah saat diproses', 'Muat ulang halaman untuk mendapatkan data terbaru, lalu coba lagi.'],
        412 => ['Prasyarat tidak terpenuhi', 'Permintaan tidak dapat diproses', 'Data atau kondisi yang diperlukan sudah berubah. Muat ulang halaman dan coba lagi.'],
        419 => ['Sesi berakhir', 'Sesi Anda sudah berakhir', 'Muat ulang halaman dan masuk kembali sebelum melanjutkan.'],
        422 => ['Data perlu diperiksa', 'Beberapa informasi belum sesuai', 'Kembali ke formulir dan periksa data yang Anda masukkan.'],
        429 => ['Terlalu banyak permintaan', 'Tunggu sebentar sebelum mencoba lagi', 'QSales menerima terlalu banyak permintaan dalam waktu singkat.'],
        default => ['Permintaan tidak dapat diproses', 'Ada kendala pada permintaan ini', 'Kembali ke halaman sebelumnya atau buka Dashboard QSales.'],
    };
@endphp

@include('errors.portal-page', [
    'status' => $status,
    'eyebrow' => $eyebrow,
    'title' => $title,
    'description' => $description,
    'isServerError' => false,
])
