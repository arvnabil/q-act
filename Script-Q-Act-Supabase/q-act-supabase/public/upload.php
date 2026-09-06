<?php
/**
 * upload.php — Script upload gambar untuk cPanel hosting
 * 
 * CARA PAKAI:
 * 1. Upload file ini ke root website cPanel (public_html/ atau folder yang bisa diakses publik)
 * 2. Buat folder "images" di lokasi yang sama, set permission 755
 * 3. Isi VITE_UPLOAD_URL di file .env dengan URL lengkap script ini
 *    Contoh: VITE_UPLOAD_URL=https://yourdomain.com/upload.php
 * 4. Build ulang project (npm run build)
 */

// === KONFIGURASI ===
define('UPLOAD_DIR', __DIR__ . '/images/');      // Folder penyimpanan gambar
define('BASE_URL', '');                           // Kosongkan = auto-detect, atau isi: https://yourdomain.com
define('MAX_SIZE_BYTES', 2 * 1024 * 1024);        // Maksimal 2MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
define('ALLOWED_EXTS',  ['jpg', 'jpeg', 'png', 'webp', 'gif']);

// === CORS ===
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

// Hapus file lama jika ada parameter old_url / action = delete
if (!empty($data['old_url']) || (!empty($data['action']) && $data['action'] === 'delete' && !empty($data['url']))) {
    $targetUrl = !empty($data['old_url']) ? $data['old_url'] : $data['url'];
    $oldFile = basename(parse_url($targetUrl, PHP_URL_PATH));
    $oldFile = preg_replace('/[^a-zA-Z0-9._-]/', '', $oldFile);
    if (!empty($oldFile) && file_exists(UPLOAD_DIR . $oldFile)) {
        @unlink(UPLOAD_DIR . $oldFile);
    }
    if (!empty($data['action']) && $data['action'] === 'delete') {
        echo json_encode(['success' => true]);
        exit;
    }
}

if (!$data || empty($data['base64']) || empty($data['filename'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Parameter base64 dan filename wajib diisi']);
    exit;
}

$base64   = $data['base64'];
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $data['filename']);

if (empty($filename)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nama file tidak valid']);
    exit;
}

$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if (!in_array($ext, ALLOWED_EXTS)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ekstensi file tidak diizinkan: ' . $ext]);
    exit;
}

$base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
$imageData  = base64_decode($base64Data);

if ($imageData === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Data base64 tidak valid']);
    exit;
}

if (strlen($imageData) > MAX_SIZE_BYTES) {
    http_response_code(400);
    echo json_encode(['error' => 'Ukuran file melebihi batas 2MB']);
    exit;
}

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

$filePath = UPLOAD_DIR . $filename;
if (file_put_contents($filePath, $imageData) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal menyimpan file ke server']);
    exit;
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl  = BASE_URL ?: "{$protocol}://{$host}";

echo json_encode([
    'url'      => "{$baseUrl}/images/{$filename}",
    'filename' => $filename,
]);
