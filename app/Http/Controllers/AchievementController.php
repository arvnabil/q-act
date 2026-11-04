<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\SalesOrder;
use App\Models\SalesTarget;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AchievementController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $effectiveRole = $user->spatie_role ?? $user->role;
        $isManagerOrAdmin = in_array($effectiveRole, ['Administrator', 'Sales Manager', 'Manager']);

        // Tab: 'proyek_deal' (default) or 'proyek_selesai'
        $tab = $request->input('tab', 'proyek_deal');

        // Month filter: e.g. '2026-11' or 'all'
        $month = $request->input('month', now()->format('Y-m'));
        $isAllMonth = $month === 'all';

        // Target stages based on tab
        $targetStages = in_array($tab, ['proyek_selesai', 'selesai_terbayar'])
            ? ['selesai_terbayar', 'proyek_selesai']
            : ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_berjalan', 'proyek_selesai'];

        // Base query for leads
        $leadQuery = Lead::active()->whereIn('stage', $targetStages);

        // Date / Month filtering
        if (!$isAllMonth) {
            try {
                $carbonMonth = Carbon::createFromFormat('Y-m', $month);
                $leadQuery->whereYear('updated_at', $carbonMonth->year)
                          ->whereMonth('updated_at', $carbonMonth->month);
            } catch (\Exception $e) {
                $month = now()->format('Y-m');
                $leadQuery->whereYear('updated_at', now()->year)
                          ->whereMonth('updated_at', now()->month);
            }
        }

        // Additional filters
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $leadQuery->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)
                  ->orWhere('customer_name', 'like', $s)
                  ->orWhere('lead_code', 'like', $s);
            });
        }

        if ($request->filled('start_date')) {
            $leadQuery->whereDate('updated_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $leadQuery->whereDate('updated_at', '<=', $request->end_date);
        }

        $deals = (clone $leadQuery)
            ->with(['sales:id,name', 'customer:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        $currentRevenue = (float) $deals->sum('estimated_value');
        $dealCount = $deals->count();

        // Previous month revenue for comparison
        $prevMonthRevenue = 0;
        $diffPercentage = 0;
        if (!$isAllMonth) {
            $prevDate = Carbon::createFromFormat('Y-m', $month)->subMonth();
            $prevMonthRevenue = (float) Lead::active()
                ->whereIn('stage', $targetStages)
                ->whereYear('updated_at', $prevDate->year)
                ->whereMonth('updated_at', $prevDate->month)
                ->sum('estimated_value');

            if ($prevMonthRevenue > 0) {
                $diffPercentage = round((($currentRevenue - $prevMonthRevenue) / $prevMonthRevenue) * 100);
            } else {
                $diffPercentage = $currentRevenue > 0 ? 100 : 0;
            }
        }

        // 6-Month Trend Data
        $trend = [];
        $indonesianMonths = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'Mei', 6 => 'Jun',
            7 => 'Jul', 8 => 'Agu', 9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des'
        ];

        for ($i = 5; $i >= 0; $i--) {
            $targetDate = now()->subMonths($i);
            $y = $targetDate->year;
            $m = $targetDate->month;
            $mKey = $targetDate->format('Y-m');

            $val = (float) Lead::active()
                ->whereIn('stage', $targetStages)
                ->whereYear('updated_at', $y)
                ->whereMonth('updated_at', $m)
                ->sum('estimated_value');

            $trend[] = [
                'key'   => $mKey,
                'label' => $indonesianMonths[$m],
                'value' => $val,
            ];
        }

        return Inertia::render('Achievements', [
            'deals'            => $deals,
            'tab'              => $tab,
            'selectedMonth'    => $month,
            'currentRevenue'   => $currentRevenue,
            'dealCount'        => $dealCount,
            'prevMonthRevenue' => $prevMonthRevenue,
            'diffPercentage'   => $diffPercentage,
            'trend'            => $trend,
            'filters'          => $request->only(['search', 'start_date', 'end_date', 'tab', 'month']),
            'isManagerOrAdmin' => $isManagerOrAdmin,
        ]);
    }
}

