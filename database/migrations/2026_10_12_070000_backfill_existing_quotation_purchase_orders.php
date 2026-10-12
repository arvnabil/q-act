<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('quotations')
            ->whereNotNull('po_number')
            ->whereNotNull('po_date')
            ->orderBy('id')
            ->chunkById(100, function ($quotations) {
                foreach ($quotations as $quotation) {
                    $alreadyMigrated = DB::table('quotation_purchase_orders')
                        ->where('quotation_id', $quotation->id)
                        ->exists();

                    if ($alreadyMigrated) {
                        continue;
                    }

                    $itemIds = DB::table('quotation_items')
                        ->where('quotation_id', $quotation->id)
                        ->orderBy('id')
                        ->pluck('id')
                        ->values()
                        ->all();

                    DB::table('quotation_purchase_orders')->insert([
                        'id' => (string) Str::uuid(),
                        'quotation_id' => $quotation->id,
                        'status' => $quotation->po_status ?: 'Diterima',
                        'po_number' => $quotation->po_number,
                        'po_date' => $quotation->po_date,
                        'document_path' => $quotation->po_document_path,
                        'quotation_item_ids' => json_encode($itemIds),
                        'created_by' => $quotation->updated_by ?: $quotation->created_by,
                        'created_at' => $quotation->created_at ?: now(),
                        'updated_at' => $quotation->updated_at ?: now(),
                    ]);
                }
            }, 'id');
    }

    public function down(): void
    {
        // Backfill records are intentionally retained on rollback so a rollback
        // of a later migration cannot delete historical PO information.
    }
};
