@php
    $status = $exception->getStatusCode();
    [$eyebrow, $title, $description] = match ($status) {
        500 => ['Kesalahan server', 'Ada kendala di QSales', 'Permintaan belum dapat diselesaikan. Silakan coba lagi beberapa saat lagi.'],
        501 => ['Fitur belum tersedia', 'Fitur ini belum dapat dijalankan', 'Coba kembali nanti atau hubungi tim Administrator QSales.'],
        502 => ['Gangguan koneksi server', 'Server belum merespons dengan baik', 'Koneksi layanan sedang terganggu. Coba muat ulang halaman sebentar lagi.'],
        503 => ['Layanan sementara tidak tersedia', 'QSales sedang tidak tersedia', 'Layanan sedang dalam pemeliharaan atau mengalami beban tinggi. Silakan coba lagi sebentar lagi.'],
        504 => ['Waktu server habis', 'Proses membutuhkan waktu lebih lama', 'Server belum selesai memproses permintaan. Silakan coba kembali.'],
        default => ['Gangguan server', 'QSales mengalami kendala sementara', 'Tim kami dapat memeriksa kendala ini. Silakan coba lagi beberapa saat lagi.'],
    };
@endphp

@include('errors.portal-page', [
    'status' => $status,
    'eyebrow' => $eyebrow,
    'title' => $title,
    'description' => $description,
    'isServerError' => true,
])
