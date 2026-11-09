<?php
namespace App\Services;

use App\Models\{User, Lead, LeadActivity, LeadVisit, SalesTarget, SystemSetting};
use Carbon\Carbon;

class PersonalDashboard
{
    public function build(User $target, $poRows, ?string $selectedQuarter = null, ?int $selectedYear = null): array
    {
        $leads = DashboardScope::owned(Lead::query()->with(['activities', 'quotation.salesOrders']), [$target->id])->get();
        $stages = collect(SystemSetting::find('lead_pipeline_settings')?->value['stages'] ?? []);
        $type = fn ($stage) => $stages->firstWhere('key', $stage)['type'] ??
            (in_array($stage, ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai']) ? 'deal' :
                (in_array($stage, ['lost', 'no_deal']) ? 'lost' : 'normal'));
        $won = $leads->filter(fn ($l) => $type($l->stage) === 'deal');
        $lost = $leads->filter(fn ($l) => $type($l->stage) === 'lost');
        $closedAt = function ($lead) use ($type) {
            // Use the latest transition into the current outcome, never creation/import time.
            $act = $lead->activities->sortByDesc('created_at')->first(fn ($a) =>
                ($a->type === 'stage_change' && $type($a->metadata['to'] ?? '') === $type($lead->stage)
                    && $type($a->metadata['from'] ?? '') !== $type($lead->stage))
                || $a->type === ($type($lead->stage) === 'deal' ? 'deal_won' : 'deal_lost'))?->created_at;

            if ($act) {
                return $act;
            }

            if ($type($lead->stage) === 'deal') {
                $q = $lead->quotation;
                if ($q) {
                    $so = $q->salesOrders?->first(fn ($s) => !empty($s->po_date));
                    if ($so && $so->po_date) {
                        return $so->po_date;
                    }
                    if ($q->po_date) {
                        return $q->po_date;
                    }
                }
                return $lead->created_at;
            }

            return null;
        };
        $within = fn ($date, $start, $end) => $date && Carbon::parse($date)->betweenIncluded($start, $end);
        $now = now();
        $year = $selectedYear ?: $now->year;

        // Tentukan nomor quarter (1, 2, 3, 4)
        if ($selectedQuarter && in_array(strtolower($selectedQuarter), ['q1', 'q2', 'q3', 'q4'])) {
            $quarterNum = (int) substr($selectedQuarter, 1);
        } else {
            $quarterNum = (int) ceil($now->month / 3);
        }

        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfMonth();

        $quarterStartMonth = ($quarterNum - 1) * 3 + 1;
        $qStart = Carbon::createFromDate($year, $quarterStartMonth, 1)->startOfMonth();
        $qEnd = Carbon::createFromDate($year, $quarterStartMonth + 2, 1)->endOfMonth();
        $quarterLabel = 'Q' . $quarterNum . ' ' . $year . ' (' . $qStart->locale('id')->translatedFormat('M') . ' - ' . $qEnd->locale('id')->translatedFormat('M') . ')';

        $monthlyWon = $won->filter(fn ($l) => $within($closedAt($l), $start, $end))->count();
        $monthlyLost = $lost->filter(fn ($l) => $within($closedAt($l), $start, $end))->count();
        $quarterWon = $won->filter(fn ($l) => $within($closedAt($l), $qStart, $qEnd))->count();
        $quarterLost = $lost->filter(fn ($l) => $within($closedAt($l), $qStart, $qEnd))->count();

        $personalPo = $poRows->filter(fn ($q) => ($q->sales_id ?: $q->created_by) === $target->id);
        $monthPo = $personalPo->filter(fn ($q) => $within($q->po_date, $start, $end));
        $quarterPo = $personalPo->filter(fn ($q) => $within($q->po_date, $qStart, $qEnd));

        $targetAmount = (float) (
            SalesTarget::where('user_id', $target->id)->where('period_year', $now->year)
                ->whereIn('period_month', [$quarterStartMonth, $quarterStartMonth + 1, $quarterStartMonth + 2])
                ->orderByDesc('period_month')->value('target_amount')
            ?? SalesTarget::where('user_id', $target->id)->orderByDesc('period_year')->orderByDesc('period_month')->value('target_amount')
            ?? $target->target_sales 
            ?? 0
        );

        $revenueThisQuarter = (float) $quarterPo->sum('grand_total');
        $targetPct = $targetAmount > 0 ? round(100 * $revenueThisQuarter / $targetAmount, 1) : 0;
        $active = $leads->filter(fn ($l) => !$l->is_archived && $type($l->stage) === 'normal');
        $activities = LeadActivity::whereDoesntHave('visit')->whereIn('lead_id', $active->pluck('id'))->whereNull('completed_at')
            ->whereNotNull('scheduled_at')->where('scheduled_at', '<=', now()->endOfWeek())->get();
        $visits = LeadVisit::with(['quotation.customer', 'lead'])->where('user_id', $target->id)->whereNull('cancelled_at')->whereNull('checked_in_at')
            ->whereNotNull('scheduled_at')->where('scheduled_at', '<=', now()->endOfWeek())->get()
            ->filter(fn ($v) => !$v->lead_id || ($v->lead && !$v->lead->is_archived && $type($v->lead->stage) === 'normal'));
        $tasks = $activities->map(fn ($a) => ['id' => 'activity-'.$a->id, 'lead_id' => $a->lead_id, 'action' => $a->title,
            'scheduled' => $a->scheduled_at])->concat($visits->map(fn ($v) => ['id' => 'visit-'.$v->id,
                'lead_id' => $v->lead_id, 'quotation_id' => $v->quotation_id, 'customer' => $v->quotation?->customer?->name, 'action' => $v->subject, 'scheduled' => $v->scheduled_at]))->sortBy('scheduled');
        $byId = $leads->concat($visits->pluck('lead')->filter())->keyBy('id');
        $upcoming = $tasks->take(5)->map(function ($t) use ($byId) {
            $l = $byId->get($t['lead_id']);
            return ['id' => $t['id'], 'url' => ($l ? '/leads/'.$l->id : (!empty($t['quotation_id']) ? '/quotations/'.$t['quotation_id'] : '/leads/visits')), 'action' => $t['action'],
                'customer' => $l?->customer_name ?: ($l?->title ?: ($t['customer'] ?? 'Agenda')), 'pic' => $l?->pic_name ?: '-', 'grand_total' => (float) ($l?->estimated_value ?? 0),
                'status' => $l?->stage ?? 'Terjadwal', 'expired' => $t['scheduled']->toDateString(),
                'days_left' => (int) now()->startOfDay()->diffInDays($t['scheduled']->copy()->startOfDay(), false),
                'priority' => $t['scheduled']->isBefore(now()->startOfDay()) ? 'Terlambat' : ($t['scheduled']->isToday() ? 'Hari ini' : 'Normal')];
        })->values()->all();
        $months = []; $trends = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = now()->startOfMonth()->subMonths($i); $e = $m->copy()->endOfMonth();
            $value = $personalPo->filter(fn ($q) => $within($q->po_date, $m, $e))->sum('grand_total');
            $deals = $won->filter(fn ($l) => $within($closedAt($l), $m, $e))->count();
            $months[] = ['month' => $m->locale('id')->translatedFormat('M'), 'year' => $m->year, 'revenue' => $value, 'deals' => $deals];
            $trends[] = ['month' => $m->locale('id')->translatedFormat('M'), 'leads' => $leads->filter(fn ($l) => $within($l->created_at, $m, $e))->count(), 'deals' => $deals, 'revenue' => $value];
        }
        $quarterLeads = $leads->filter(fn ($l) => $within($l->created_at, $qStart, $qEnd))->count();
        $quarterWinRate = ($quarterWon + $quarterLost) > 0 ? round(100 * $quarterWon / ($quarterWon + $quarterLost), 1) : 0;
        $quarterRevenue = (float) $quarterPo->sum('grand_total');
        $quarterPoCount = $quarterPo->count();

        // 3 bulan dalam quarter yang dipilih untuk chart
        $quarterMonthlyBreakdown = [];
        for ($mIdx = $quarterStartMonth; $mIdx <= $quarterStartMonth + 2; $mIdx++) {
            $mDate = Carbon::createFromDate($year, $mIdx, 1)->startOfMonth();
            $mEnd = $mDate->copy()->endOfMonth();
            $val = (float) $personalPo->filter(fn ($q) => $within($q->po_date, $mDate, $mEnd))->sum('grand_total');
            $deals = $won->filter(fn ($l) => $within($closedAt($l), $mDate, $mEnd))->count();
            $quarterMonthlyBreakdown[] = [
                'month' => $mDate->locale('id')->translatedFormat('M'),
                'fullMonth' => $mDate->locale('id')->translatedFormat('F'),
                'year' => $mDate->year,
                'revenue' => $val,
                'deals' => $deals,
            ];
        }

        $rate = ($won->count() + $lost->count()) ? round(100 * $won->count() / ($won->count() + $lost->count()), 1) : 0;
        return [
            'targetUser' => $target->only('id', 'name', 'email', 'role'),
            'quarterLabel' => $quarterLabel,
            'selectedQuarter' => 'q' . $quarterNum,
            'selectedYear' => $year,
            'availableQuarters' => [
                ['key' => 'q4', 'label' => 'Q4 (Okt - Des)', 'fullLabel' => 'Q4 ' . $year . ' (Okt - Des)'],
                ['key' => 'q3', 'label' => 'Q3 (Jul - Sep)', 'fullLabel' => 'Q3 ' . $year . ' (Jul - Sep)'],
                ['key' => 'q2', 'label' => 'Q2 (Apr - Jun)', 'fullLabel' => 'Q2 ' . $year . ' (Apr - Jun)'],
                ['key' => 'q1', 'label' => 'Q1 (Jan - Mar)', 'fullLabel' => 'Q1 ' . $year . ' (Jan - Mar)'],
            ],
            'revenueThisQuarter' => $revenueThisQuarter,
            'poCountThisQuarter' => $quarterPoCount,
            'quarterStats' => [
                'totalLeads' => $quarterLeads,
                'dealsWon' => $quarterWon,
                'dealsLost' => $quarterLost,
                'winRate' => $quarterWinRate,
                'totalRevenue' => $quarterRevenue,
                'poCount' => $quarterPoCount,
            ],
            'quarterMonthlyBreakdown' => $quarterMonthlyBreakdown,
            'revenueThisMonth' => $monthPo->sum('grand_total'), 
            'poCountThisMonth' => $monthPo->count(),
            'dealsWonThisMonth' => $monthlyWon, 
            'dealsLostThisMonth' => $monthlyLost,
            'dealsWonThisQuarter' => $quarterWon,
            'dealsLostThisQuarter' => $quarterLost,
            'targetAmount' => $targetAmount, 
            'targetPct' => $targetPct,
            'forecastPipeline' => $active->sum('estimated_value'), 'monthlyRevenueLast6' => $months, 'monthlyTrendsLast6' => $trends,
            'allTime' => ['totalLeads' => $leads->count(), 'dealsWon' => $won->count(), 'dealsLost' => $lost->count(),
                'winRate' => $rate, 'totalRevenue' => (float) $personalPo->sum('grand_total')],
            'pipelineReview' => ['totalLeads' => $active->count(), 'dealsWon' => $won->count(), 'dealsLost' => $lost->count(),
                'needsFollowUp' => $tasks->map(fn ($t) => $t['lead_id'] ?: ($t['quotation_id'] ?? $t['id']))->unique()->count(),
                'todayAgenda' => $tasks->filter(fn ($t) => $t['scheduled']->isToday())->count(),
                'nextCustomer' => $upcoming[0]['customer'] ?? null,
                'dealsThisMonth' => $monthlyWon,
                'dealsThisQuarter' => $quarterWon,
                'dealsLostThisQuarter' => $quarterLost,
                'quarterWinRate' => $quarterWinRate,
                'monthWinRate' => ($monthlyWon + $monthlyLost) ? round(100 * $monthlyWon / ($monthlyWon + $monthlyLost), 1) : 0],
            'missingCloseDate' => $won->concat($lost)->filter(fn ($l) => !$closedAt($l))->count(),
            'smartTip' => ['title' => 'Prioritas Follow-up', 'message' => $tasks->isEmpty()
                ? 'Belum ada agenda terjadwal sampai akhir minggu. Jadwalkan tindak lanjut dari quotation atau lead.'
                : 'Ada '.$tasks->count().' agenda belum selesai sampai akhir minggu, termasuk yang terlambat. Urutan berdasarkan tanggal jadwal.'],
            'upcomingTasks' => $upcoming,
        ];
    }
}
