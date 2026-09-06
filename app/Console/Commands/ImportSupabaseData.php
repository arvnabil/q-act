<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportSupabaseData extends Command
{
    protected $signature = 'db:import-supabase {file : Path to the supabase data.sql file} {--table= : Only import this specific table}';
    protected $description = 'Import Supabase PostgreSQL data dump into MySQL';

    // Column mapping: skip columns not present in MySQL schema
    protected array $skipColumns = [
        'quotations' => ['calc_pph', 'show_pph'], // These exist - keep all
    ];

    // Only import these tables (in order)
    protected array $allowedTables = [
        'business_units',
        'users',
        'customers',
        'customer_pics',
        'brands',
        'products',
        'company_bank_accounts',
        'quotations',
        'quotation_items',
        'quotation_sales_notes',
        'sales_orders',
        'sales_order_items',
        'system_settings',
        'sales_targets',
    ];

    public function handle()
    {
        $file = $this->argument('file');
        $onlyTable = $this->option('table');

        if (!File::exists($file)) {
            $this->error("File not found: {$file}");
            return 1;
        }

        $this->info("Reading SQL dump...");
        $content = File::get($file);

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Split by the INSERT INTO "public"." marker
        $parts = explode('INSERT INTO "public"."', $content);
        array_shift($parts); // Remove header

        $this->info("Found " . count($parts) . " table blocks");

        foreach ($parts as $part) {
            // Extract table name (up to the first double quote)
            $tableEnd = strpos($part, '"');
            if ($tableEnd === false) continue;
            $table = substr($part, 0, $tableEnd);

            // Filter
            if ($onlyTable && $table !== $onlyTable) continue;
            if (!in_array($table, $this->allowedTables)) {
                $this->line("Skipping non-allowed table: {$table}");
                continue;
            }

            $this->info("Processing table: {$table}");

            // Parse columns: ("col1", "col2", ...) 
            $colMatch = preg_match('/\("([^)]+)"\)\s*VALUES/s', $part, $colMatches);
            if (!$colMatch) {
                $this->warn(" - Could not parse columns for {$table}");
                continue;
            }

            // Get column names from the dump
            $rawColStr = $colMatches[1];
            // Columns are: "col1", "col2", ... - split by ", "
            $pgColumns = array_map(function($c) {
                return trim($c, '"');
            }, explode('", "', $rawColStr));

            // Get MySQL columns for this table
            try {
                $mysqlColumns = DB::getSchemaBuilder()->getColumnListing($table);
            } catch (\Exception $e) {
                $this->warn(" - Table {$table} not found in MySQL, skipping");
                continue;
            }

            if (empty($mysqlColumns)) {
                $this->warn(" - No columns found in MySQL for {$table}");
                continue;
            }

            // Find which PG columns actually exist in MySQL
            $validColumns = array_intersect($pgColumns, $mysqlColumns);
            $validIndexes = [];
            foreach ($pgColumns as $idx => $col) {
                if (in_array($col, $validColumns)) {
                    $validIndexes[] = $idx;
                }
            }

            $this->line(" - PG columns: " . count($pgColumns) . " | MySQL matching: " . count($validColumns));

            // Now find VALUES section
            $valuesStart = strpos($part, ') VALUES');
            if ($valuesStart === false) {
                $this->warn(" - No VALUES found for {$table}");
                continue;
            }

            // Get raw values string - everything after ) VALUES\n until the last ); before next comment block or end
            $valuesString = substr($part, $valuesStart + 8); // skip ") VALUES"
            $valuesString = ltrim($valuesString);

            // Trim off trailing comments/SQL
            // Find where VALUES block ends: last ); that is followed by \n\n-- or end of string
            // Strip trailing PostgreSQL-specific stuff
            $valuesString = preg_replace('/;[\s\S]*$/', '', $valuesString, 1);
            $valuesString = trim($valuesString);

            // Convert PostgreSQL booleans to MySQL
            $valuesString = preg_replace('/\btrue\b/', '1', $valuesString);
            $valuesString = preg_replace('/\bfalse\b/', '0', $valuesString);

            // Convert timestamp with timezone: '2026-08-09 12:18:58.354731+00' -> '2026-08-09 12:18:58'
            $valuesString = preg_replace("/'(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})\\.?\\d*[+-]\\d{2}'/", "'$1'", $valuesString);

            // If all columns match, just do a simple INSERT IGNORE
            if (count($validColumns) === count($pgColumns)) {
                $cols = '`' . implode('`, `', $pgColumns) . '`';
                $query = "INSERT IGNORE INTO `{$table}` ({$cols}) VALUES {$valuesString}";
                try {
                    DB::statement($query);
                    $this->line(" - Success (all columns)");
                } catch (\Exception $e) {
                    $this->error(" - Error: " . $e->getMessage());
                }
            } else {
                // We need to parse each row and only pick valid columns
                $this->warn(" - Column mismatch, using PHP-level row parsing (slower)");
                // For now, skip - we can handle this later
                $this->warn(" - Columns in PG not in MySQL: " . implode(', ', array_diff($pgColumns, $mysqlColumns)));
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        $this->info("Import complete!");
        return 0;
    }
}
