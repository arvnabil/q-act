<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MergeCustomers extends Command
{
    protected $signature = 'customers:merge-duplicates
                            {--dry-run : Show what would be merged without making changes}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Scan and merge duplicate customer names (case-insensitive). Run before applying unique constraint.';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');

        $this->info('=== Customer Duplicate Merger ===');
        $this->newLine();

        // Find all duplicate groups (case-insensitive, trimmed)
        $duplicates = DB::table('customers')
            ->select(DB::raw('LOWER(TRIM(name)) as norm_name'), DB::raw('COUNT(*) as cnt'))
            ->groupBy(DB::raw('LOWER(TRIM(name))'))
            ->having('cnt', '>', 1)
            ->orderBy('cnt', 'desc')
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('✓ No duplicate customer names found. Database is clean!');
            return self::SUCCESS;
        }

        $this->warn("Found {$duplicates->count()} duplicate group(s):");
        $this->newLine();

        // For each group, show details
        $mergePlan = [];
        foreach ($duplicates as $dup) {
            $customers = DB::table('customers')
                ->whereRaw('LOWER(TRIM(name)) = ?', [$dup->norm_name])
                ->orderBy('created_at', 'asc') // Keep oldest
                ->get();

            $this->line("  Group: \"{$customers->first()->name}\" ({$dup->cnt} records)");

            $rows = [];
            foreach ($customers as $c) {
                $picCount = DB::table('customer_pics')->where('customer_id', $c->id)->count();
                $qCount   = DB::table('quotations')->where('customer_id', $c->id)->count();
                $soCount  = DB::table('sales_orders')->where('customer_id', $c->id)->count();
                $leadCount = DB::table('leads')->where('customer_id', $c->id)->count();
                $rows[] = [$c->id, $c->name, $picCount, $qCount, $soCount, $leadCount, $c->created_at ?? '-'];
            }

            $this->table(
                ['ID', 'Name', 'PICs', 'Quotations', 'SOs', 'Leads', 'Created At'],
                $rows
            );

            $keep   = $customers->first(); // Keep oldest
            $removes = $customers->slice(1)->values();

            $this->line("  → KEEP: [{$keep->id}] | REMOVE: " . $removes->pluck('id')->join(', '));
            $this->newLine();

            $mergePlan[] = ['keep' => $keep, 'removes' => $removes];
        }

        if ($isDryRun) {
            $this->warn('DRY RUN — no changes made. Remove --dry-run to apply.');
            return self::SUCCESS;
        }

        if (!$this->option('force')) {
            if (!$this->confirm("Proceed with merging {$duplicates->count()} group(s)? This CANNOT be undone.")) {
                $this->info('Aborted.');
                return self::SUCCESS;
            }
        }

        DB::beginTransaction();
        try {
            foreach ($mergePlan as $plan) {
                $keep = $plan['keep'];

                foreach ($plan['removes'] as $remove) {
                    $this->line("Merging [{$remove->id}] → [{$keep->id}] ({$keep->name})");

                    // Collect emails already on keep customer to avoid PIC duplicates
                    $keepPicEmails = DB::table('customer_pics')
                        ->where('customer_id', $keep->id)
                        ->pluck('email')
                        ->filter()
                        ->map(fn($e) => strtolower($e))
                        ->toArray();

                    // Move PICs
                    $removePics = DB::table('customer_pics')
                        ->where('customer_id', $remove->id)
                        ->get();

                    foreach ($removePics as $pic) {
                        $emailLower = $pic->email ? strtolower($pic->email) : null;
                        if ($emailLower && in_array($emailLower, $keepPicEmails)) {
                            DB::table('customer_pics')->where('id', $pic->id)->delete();
                            $this->line("  - PIC '{$pic->name}' is duplicate (email match) — deleted.");
                        } else {
                            DB::table('customer_pics')->where('id', $pic->id)->update([
                                'customer_id' => $keep->id,
                                'is_primary'  => false,
                            ]);
                            $this->line("  - PIC '{$pic->name}' moved to [{$keep->id}].");
                        }
                    }

                    // Move quotations
                    $qMoved = DB::table('quotations')->where('customer_id', $remove->id)->count();
                    DB::table('quotations')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                    $this->line("  - Moved {$qMoved} quotation(s).");

                    // Move sales orders
                    $soMoved = DB::table('sales_orders')->where('customer_id', $remove->id)->count();
                    DB::table('sales_orders')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                    $this->line("  - Moved {$soMoved} sales order(s).");

                    // Move leads
                    $leadMoved = DB::table('leads')->where('customer_id', $remove->id)->count();
                    DB::table('leads')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                    $this->line("  - Moved {$leadMoved} lead(s).");

                    // Delete duplicate customer
                    DB::table('customers')->where('id', $remove->id)->delete();
                    $this->line("  - Deleted customer [{$remove->id}].");
                }
            }

            DB::commit();
            $this->newLine();
            $this->info('✓ All duplicates merged successfully!');
            $this->info('✓ You can now safely run the unique constraint migration.');

        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('✗ ERROR: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
