<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Console\Command;

class NotifyStaleLeads extends Command
{
    protected $signature   = 'leads:notify-stale';
    protected $description = 'Kirim notifikasi untuk lead yang tidak di-follow-up lebih dari 3 hari';

    public function handle(): void
    {
        $cutoff = Carbon::now()->subDays(3);

        // Dynamically find terminal stages (deal/lost) from pipeline settings
        $pipelineSetting = \App\Models\SystemSetting::find('lead_pipeline_settings');
        $terminalStages = ['lost', 'selesai_terbayar', 'win', 'proyek_selesai', 'no_deal'];
        if ($pipelineSetting && is_array($pipelineSetting->value) && isset($pipelineSetting->value['stages'])) {
            foreach ($pipelineSetting->value['stages'] as $st) {
                if (in_array($st['type'] ?? '', ['deal', 'lost'])) {
                    $terminalStages[] = $st['key'];
                }
            }
        }
        $terminalStages = array_unique($terminalStages);

        // Find leads with no activity in last 3 days, not in terminal stages
        $staleLeads = Lead::active()
            ->whereNotIn('stage', $terminalStages)
            ->whereDoesntHave('activities', function ($q) use ($cutoff) {
                $q->where('created_at', '>=', $cutoff);
            })
            ->where('created_at', '<', $cutoff)
            ->with('sales:id,name')
            ->get();

        $count = 0;

        foreach ($staleLeads as $lead) {
            if (!$lead->sales_id) {
                continue;
            }

            // Check if notification already sent today
            $alreadyNotified = Notification::where('user_id', $lead->sales_id)
                ->where('data->lead_id', $lead->id)
                ->where('data->type', 'stale_lead')
                ->whereDate('created_at', today())
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            Notification::create([
                'user_id' => $lead->sales_id,
                'title'   => '⚠️ Lead tidak ada aktivitas',
                'message' => "Lead \"{$lead->title}\" belum ada follow-up selama 3+ hari.",
                'type'    => 'warning',
                'data'    => [
                    'lead_id'  => $lead->id,
                    'type'     => 'stale_lead',
                    'lead_url' => '/leads/' . $lead->id,
                ],
            ]);

            $count++;
        }

        $this->info("Notifikasi stale lead terkirim: {$count}");
    }
}

