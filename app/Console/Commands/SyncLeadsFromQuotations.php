<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\{Lead, Quotation, LeadActivity, SystemSetting};
use Carbon\Carbon;

class SyncLeadsFromQuotations extends Command
{
    protected $signature = 'leads:sync-quotations';
    protected $description = 'Sinkronkan tanggal created_at dan status deal lead yang terhubung ke quotation/PO';

    public function handle(): int
    {
        $this->info('Memulai sinkronisasi data lead dari quotation...');

        $stages = collect(SystemSetting::find('lead_pipeline_settings')?->value['stages'] ?? []);
        $dealStage = $stages->firstWhere('type', 'deal')['key'] ?? 'win';

        $leads = Lead::with(['quotation.salesOrders', 'quotations.salesOrders', 'activities'])->get();
        $updatedCount = 0;
        $stageUpdatedCount = 0;

        foreach ($leads as $lead) {
            $q = $lead->quotation ?: $lead->quotations->sortByDesc('grand_total')->first();
            if (!$q) {
                continue;
            }

            $activeSos = $q->salesOrders ? $q->salesOrders->filter(fn($s) => !in_array(strtoupper($s->status ?? ''), ['REVISED', 'CANCELLED', 'BATAL'])) : collect();
            $soWithPo = $activeSos->first(fn($s) => !empty($s->po_date));
            $hasPo = $q->status === 'approved' || !empty($q->po_number) || !empty($q->po_date) || $activeSos->isNotEmpty();

            $qDate = $q->date ? Carbon::parse($q->date) : ($q->created_at ? Carbon::parse($q->created_at) : null);
            $poDate = $soWithPo?->po_date ? Carbon::parse($soWithPo->po_date) : ($q->po_date ? Carbon::parse($q->po_date) : $qDate);
            $leadCreatedAt = $lead->created_at ? Carbon::parse($lead->created_at) : null;

            $needsDateSync = false;
            $needsStageSync = false;

            // 1. Sinkronkan created_at lead jika lead dibuat setelah quotation
            if ($qDate && $leadCreatedAt && $leadCreatedAt->greaterThan($qDate->copy()->addDay())) {
                $needsDateSync = true;
            }

            // 2. Jika quotation sudah PO/Approved, tapi lead masih di stage normal
            $isDeal = in_array($lead->stage, ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai']);
            if ($hasPo && !$isDeal) {
                $needsStageSync = true;
            }

            if ($needsDateSync || $needsStageSync) {
                if ($needsDateSync) {
                    $lead->created_at = $qDate;
                }
                if ($needsStageSync) {
                    $lead->stage = $dealStage;
                    $stageUpdatedCount++;

                    // Catat activity deal_won jika belum ada
                    $hasWonAct = $lead->activities->some(fn($a) => $a->type === 'deal_won' || ($a->type === 'stage_change' && in_array($a->metadata['to'] ?? '', ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai'])));
                    if (!$hasWonAct) {
                        $poDateStr = $poDate ? Carbon::parse($poDate)->toDateString() : null;
                        LeadActivity::create([
                            'lead_id' => $lead->id,
                            'user_id' => $lead->sales_id ?: $lead->created_by,
                            'type' => 'deal_won',
                            'title' => 'Deal dimenangkan (otomatis dari Quotation / PO ' . ($q->po_number ?: $q->id) . ')',
                            'metadata' => [
                                'quotation_id' => $q->id,
                                'po_number' => $q->po_number,
                                'po_date' => $poDateStr,
                                'amount' => (float) $q->grand_total,
                            ],
                            'created_at' => $poDate ?: ($qDate ?: now()),
                            'updated_at' => $poDate ?: ($qDate ?: now()),
                        ]);
                    }
                }

                $lead->timestamps = false;
                $lead->save();
                $updatedCount++;

                $createdDisplay = $lead->created_at ? Carbon::parse($lead->created_at)->toDateString() : '-';
                $this->line("Synced Lead: [{$lead->lead_code}] {$lead->title} -> Stage: {$lead->stage}, Created: {$createdDisplay}");
            }
        }

        $this->info("Sinkronisasi selesai! {$updatedCount} lead diperbarui (termasuk {$stageUpdatedCount} lead diubah ke Deal Menang).");
        return Command::SUCCESS;
    }
}
