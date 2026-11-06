<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportProductionSql extends Command
{
    protected $signature = 'db:import-production {file=activcoi_qsales.sql : Path to SQL file}';
    protected $description = 'Import production SQL dump safely with disabled foreign key checks';

    public function handle(): int
    {
        $filePath = base_path($this->argument('file'));

        if (!file_exists($filePath)) {
            $this->error("File tidak ditemukan: {$filePath}");
            return Command::FAILURE;
        }

        $this->info("Menyiapkan database target...");
        $pdo = DB::connection()->getPdo();

        // Nonaktifkan FK checks
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

        // Bersihkan tabel lama jika ada
        $tables = $pdo->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);

        if (!empty($tables)) {
            $this->line("Menghapus " . count($tables) . " tabel lama untuk mencegah konflik...");
            foreach ($tables as $table) {
                $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
            }
        }

        $this->info("Membaca dan mengeksekusi {$this->argument('file')}...");
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            $this->error("Gagal membuka file SQL.");
            return Command::FAILURE;
        }

        $sql = '';
        $queryCount = 0;
        $bar = $this->output->createProgressBar();

        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);

            if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
                continue;
            }

            $sql .= $line;

            if (substr(rtrim($trimmed), -1) === ';') {
                $queryCount++;
                try {
                    $pdo->exec($sql);
                } catch (\PDOException $e) {
                    $this->newLine();
                    $this->error("Error pada query #{$queryCount}: " . $e->getMessage());
                    $this->line("Potongan query: " . substr(trim($sql), 0, 200));
                    fclose($handle);
                    return Command::FAILURE;
                }
                $sql = '';
                $bar->advance();
            }
        }
        fclose($handle);

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        $bar->finish();
        $this->newLine();

        $importedTables = $pdo->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);
        $this->info("BERHASIL! Sebanyak {$queryCount} blok query berhasil diimpor.");
        $this->info("Total tabel di database sekarang: " . count($importedTables));

        return Command::SUCCESS;
    }
}

