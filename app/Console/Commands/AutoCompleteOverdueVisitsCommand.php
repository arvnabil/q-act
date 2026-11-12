<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadVisit;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoCompleteOverdueVisitsCommand extends Command
{
    protected $signature = 'visits:auto-complete-overdue';
    protected $description = 'Tandai otomatis selesai untuk agenda kunjungan yang lewat 2 hari belum diselesaikan';

    public function handle(): int
    {
        $cutoff = Carbon::now()->subDays(2);

        $overdueVisits = LeadVisit::whereNull('checked_in_at')
            ->whereNull('cancelled_at')
            ->where('scheduled_at', '<', $cutoff)
            ->get();

        if ($overdueVisits->isEmpty()) {
            $this->info('Tidak ada kunjungan yang lewat 2 hari untuk diselesaikan otomatis.');
            return self::SUCCESS;
        }

        $completedCount = 0;
        $now = Carbon::now();

        foreach ($overdueVisits as $visit) {
            $visitNote = trim(($visit->notes ?? '') . "\n[Sistem] Kunjungan ditandai selesai otomatis oleh sistem setelah melewati 2 hari.");
            $visit->update([
                'checked_in_at' => $now,
                'outcome'       => $visit->outcome ?: 'Selesai (Otomatis oleh Sistem)',
                'notes'         => $visitNote,
            ]);

            // Update associated lead activity if any
            if ($visit->lead_activity_id) {
                LeadActivity::whereKey($visit->lead_activity_id)->update([
                    'completed_at' => $now,
                ]);
            }

            // Log activity on lead if linked
            if ($visit->lead_id) {
                $lead = Lead::find($visit->lead_id);
                if ($lead) {
                    LeadActivity::create([
                        'lead_id'     => $lead->id,
                        'user_id'     => $visit->user_id,
                        'type'        => 'visit',
                        'title'       => 'Kunjungan selesai otomatis',
                        'description' => "Agenda '{$visit->subject}' ditandai selesai otomatis oleh sistem setelah 2 hari.",
                    ]);
                }
            }

            $completedCount++;
        }

        $this->info("Berhasil menandai selesai otomatis {$completedCount} agenda kunjungan yang lewat 2 hari.");
        Log::info("AutoCompleteOverdueVisits: {$completedCount} agenda selesai otomatis.");

        return self::SUCCESS;
    }
}
