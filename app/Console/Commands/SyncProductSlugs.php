<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SyncProductSlugs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:sync-slugs 
                            {--force : Timpa slug yang sudah ada sebelumnya} 
                            {--chunk=200 : Jumlah pemrosesan per batch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate dan sinkronisasi slug URL dari nama / title produk';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $force = $this->option('force');
        $chunkSize = (int) $this->option('chunk');

        $query = Product::query();
        if (!$force) {
            $query->where(function ($q) {
                $q->whereNull('slug')->orWhere('slug', '');
            });
        }

        $total = $query->count();

        if ($total === 0) {
            $this->info('✓ Semua produk sudah memiliki slug. Gunakan --force jika ingin membuat ulang seluruh slug.');
            return Command::SUCCESS;
        }

        $this->info("Memulai sinkronisasi slug untuk {$total} produk berdasarkan nama (title)...");
        if ($force) {
            $this->warn('Mode --force aktif: slug yang ada akan ditimpa ulang.');
        }

        $progressBar = $this->output->createProgressBar($total);
        $progressBar->start();

        $updatedCount = 0;
        $usedSlugs = [];

        // Ambil semua slug yang sudah terdaftar di database untuk menghindari collision
        if (!$force) {
            $usedSlugs = Product::whereNotNull('slug')
                ->where('slug', '!=', '')
                ->pluck('slug')
                ->all();
        }

        $usedSlugsMap = array_fill_keys($usedSlugs, true);
        $samples = [];

        foreach ($query->orderBy('sku')->cursor() as $product) {
            // Generate base slug dari nama / title produk
            $baseSlug = Str::slug($product->name);

            // Jika nama kosong atau karakter non-latin, fallback ke SKU atau random
            if (empty($baseSlug)) {
                $cleanSku = preg_replace('/[\r\n]+/', ' ', (string) $product->sku);
                $baseSlug = Str::slug($cleanSku) ?: ('prod-' . Str::lower(Str::random(8)));
            }

            // Cari slug yang unik
            $slug = $baseSlug;
            $counter = 1;

            while (isset($usedSlugsMap[$slug])) {
                $slug = "{$baseSlug}-" . (++$counter);
            }

            $usedSlugsMap[$slug] = true;

            // Simpan langsung ke database tanpa trigger event loop berulang
            $product->slug = $slug;
            $product->saveQuietly();

            $updatedCount++;

            if (count($samples) < 5) {
                $samples[] = [
                    'SKU' => Str::limit($product->sku, 20),
                    'Nama Produk' => Str::limit($product->name, 35),
                    'Slug yang Dibuat' => $slug,
                ];
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("✓ Berhasil sinkronisasi slug untuk {$updatedCount} produk.");

        if (!empty($samples)) {
            $this->newLine();
            $this->comment('Contoh slug yang dihasilkan:');
            $this->table(['SKU', 'Nama Produk', 'Slug yang Dibuat'], $samples);
        }

        return Command::SUCCESS;
    }
}
