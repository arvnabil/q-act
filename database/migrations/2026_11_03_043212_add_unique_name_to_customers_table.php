<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First, trim any whitespace from existing names to prevent constraint issues
        DB::statement("UPDATE customers SET name = TRIM(name) WHERE name != TRIM(name)");

        // Automatically merge existing duplicate customer records before applying unique constraint
        $duplicateNames = DB::table('customers')
            ->select(DB::raw('LOWER(TRIM(name)) as trimmed_name'))
            ->groupBy(DB::raw('LOWER(TRIM(name))'))
            ->havingRaw('COUNT(*) > 1')
            ->pluck('trimmed_name');

        foreach ($duplicateNames as $dupName) {
            $records = DB::table('customers')
                ->whereRaw('LOWER(TRIM(name)) = ?', [$dupName])
                ->orderBy('id')
                ->get();

            if ($records->count() <= 1) {
                continue;
            }

            $keep = $records->first();
            $removeList = $records->slice(1);

            foreach ($removeList as $remove) {
                // 1. Move PICs without duplicate email
                $keepPicEmails = DB::table('customer_pics')
                    ->where('customer_id', $keep->id)
                    ->pluck('email')
                    ->filter()
                    ->map(fn($e) => strtolower($e))
                    ->toArray();

                $removePics = DB::table('customer_pics')->where('customer_id', $remove->id)->get();
                foreach ($removePics as $pic) {
                    $emailLower = $pic->email ? strtolower($pic->email) : null;
                    if ($emailLower && in_array($emailLower, $keepPicEmails, true)) {
                        DB::table('customer_pics')->where('id', $pic->id)->delete();
                    } else {
                        DB::table('customer_pics')->where('id', $pic->id)->update([
                            'customer_id' => $keep->id,
                            'is_primary'  => false,
                        ]);
                    }
                }

                // 2. Reassign quotations
                if (Schema::hasTable('quotations')) {
                    DB::table('quotations')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                }

                // 3. Reassign sales orders
                if (Schema::hasTable('sales_orders')) {
                    DB::table('sales_orders')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                }

                // 4. Reassign leads
                if (Schema::hasTable('leads')) {
                    DB::table('leads')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                }

                // 5. Reassign lead visits
                if (Schema::hasTable('lead_visits')) {
                    DB::table('lead_visits')->where('customer_id', $remove->id)->update(['customer_id' => $keep->id]);
                }

                // 6. Delete duplicate customer
                DB::table('customer_pics')->where('customer_id', $remove->id)->delete();
                DB::table('customers')->where('id', $remove->id)->delete();
            }
        }

        try {
            Schema::table('customers', function (Blueprint $table) {
                $table->unique('name', 'customers_name_unique');
            });
        } catch (\Throwable $e) {
            // If unique index already exists or cannot be created, log warning rather than halting migrations
            \Illuminate\Support\Facades\Log::warning('Could not add customers_name_unique: ' . $e->getMessage());
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_name_unique');
        });
    }
};
