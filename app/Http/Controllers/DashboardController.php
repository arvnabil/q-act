<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\Customer;
use App\Models\User;
use App\Models\SalesTarget;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);

        // Period defaults to last 6 months
        $period = $request->get('period', '6m');
        $customStart = $request->get('custom_start');
        $customEnd = $request->get('custom_end');
        $salesFilter = $request->get('sales_filter', 'all');

        [$periodStart, $periodEnd] = $this->getPeriodRange($period, $customStart, $customEnd);

        // Base query - fetch active quotations in period for dashboard metrics
        $quotationQuery = Quotation::active()
            ->with(['customer', 'sales', 'items'])
            ->whereBetween('created_at', [$periodStart, $periodEnd]);

        if ($salesFilter !== 'all') {
            $quotationQuery->where(function ($q) use ($salesFilter) {
                $q->where('sales_id', $salesFilter)
                  ->orWhere('created_by', $salesFilter);
            });
        }

        $quotations = $quotationQuery->get();

        // KPIs
        $totalQ = $quotations->count();
        $approvedQ = $quotations->where('status', 'approved');
        $approvedCount = $approvedQ->count();
        $totalAllValue = $quotations->sum('grand_total');
        $totalPOValue = $approvedQ->sum('grand_total');
        $conversionRate = $totalQ > 0 ? round(($approvedCount / $totalQ) * 100) : 0;

        // Status counts
        $statusCounts = [
            'approved' => $quotations->where('status', 'approved')->count(),
            'sent' => $quotations->where('status', 'sent')->count(),
            'created' => $quotations->whereIn('status', ['created', 'draft'])->count(),
            'rejected' => $quotations->where('status', 'rejected')->count(),
            'expired' => $quotations->where('status', 'expired')->count(),
        ];

        // Revenue chart — monthly
        $chartMonths = $this->buildChartMonths($quotations, $periodStart, $periodEnd);

        // Top 5 customers by PO value
        $customerMap = [];
        foreach ($quotations as $q) {
            $cid = $q->customer_id ?? 'unknown';
            $name = $q->customer?->name ?? 'Customer';
            if (!isset($customerMap[$cid])) {
                $customerMap[$cid] = ['name' => $name, 'poValue' => 0, 'poCount' => 0, 'totalQ' => 0];
            }
            $customerMap[$cid]['totalQ']++;
            if ($q->status === 'approved') {
                $customerMap[$cid]['poValue'] += $q->grand_total ?? 0;
                $customerMap[$cid]['poCount']++;
            }
        }
        usort($customerMap, fn($a, $b) => $b['poValue'] <=> $a['poValue']);
        $topCustomers = array_slice(array_values($customerMap), 0, 5);

        // Sales users & performance
        $salesUsers = User::whereIn('role', ['Sales', 'Presales'])->where('is_active', true)->get();
        $salesTargets = SalesTarget::pluck('target_amount', 'user_id')->toArray();
        $defaultTarget = 600_000_000;

        // Build salesPerf (all active quotations in system)
        $allQuotations = Quotation::active()->with('items')->get();

        $salesPerf = $salesUsers->map(function ($s) use ($allQuotations, $salesTargets, $defaultTarget, $periodStart, $periodEnd) {
            $userQ = $allQuotations->filter(fn($q) =>
                $q->sales_id === $s->id || $q->created_by === $s->id
            );
            $periodQ = $userQ->filter(fn($q) =>
                $q->created_at && $q->created_at >= $periodStart && $q->created_at <= $periodEnd
            );
            $achieved = $periodQ->where('status', 'approved')->sum('grand_total');
            $target = $salesTargets[$s->id] ?? $defaultTarget;

            return [
                'id' => $s->id,
                'name' => $s->name,
                'avatar' => $this->getInitials($s->name),
                'target' => $target,
                'achieved' => $achieved,
            ];
        })->sortByDesc('achieved')->values()->toArray();

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalQ' => $totalQ,
                'totalAllValue' => $totalAllValue,
                'totalPOValue' => $totalPOValue,
                'approvedCount' => $approvedCount,
                'conversionRate' => $conversionRate,
                'statusCounts' => $statusCounts,
                'chartMonths' => $chartMonths,
                'topCustomers' => $topCustomers,
                'salesPerf' => $salesPerf,
            ],
            'salesUsers' => $salesUsers->map(fn($u) => ['id' => $u->id, 'name' => $u->name])->values(),
            'filters' => [
                'period' => $period,
                'salesFilter' => $salesFilter,
                'customStart' => $customStart,
                'customEnd' => $customEnd,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
            ],
        ]);
    }

    private function getPeriodRange(string $period, ?string $customStart, ?string $customEnd): array
    {
        $now = now();
        if ($period === 'custom' && $customStart && $customEnd) {
            return [Carbon::parse($customStart)->startOfDay(), Carbon::parse($customEnd)->endOfDay()];
        }
        $months = match ($period) {
            '1m' => 1, '3m' => 3, '6m' => 6, '12m' => 12, default => 6,
        };
        return [
            $now->copy()->subMonths($months - 1)->startOfMonth(),
            $now->copy()->endOfMonth(),
        ];
    }

    private function buildChartMonths($quotations, Carbon $start, Carbon $end): array
    {
        $months = [];
        $cur = $start->copy()->startOfMonth();
        while ($cur->lte($end->copy()->endOfMonth())) {
            $mStart = $cur->copy()->startOfMonth();
            $mEnd = $cur->copy()->endOfMonth();
            $label = $cur->locale('id')->translatedFormat('M y');
            $inMonth = $quotations->filter(fn($q) =>
                $q->created_at && $q->created_at >= $mStart && $q->created_at <= $mEnd
            );
            $revPO = $inMonth->where('status', 'approved')->sum('grand_total');
            $revNonPO = $inMonth->where('status', '!=', 'approved')->sum('grand_total');
            $months[] = ['label' => $label, 'revPO' => $revPO, 'revNonPO' => $revNonPO];
            $cur->addMonth();
        }
        return $months;
    }

    private function getInitials(string $name): string
    {
        $parts = explode(' ', trim($name));
        $initials = '';
        foreach ($parts as $p) {
            if ($p) $initials .= strtoupper($p[0]);
        }
        return substr($initials, 0, 2);
    }

    /**
     * Update target amount for sales users.
     */
    public function updateSalesTargets(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermissionTo('sales_targets_edit') && !in_array($user->role, ['Administrator', 'Sales Manager', 'Manager'])) {
            return back()->with('error', 'Anda tidak memiliki hak akses untuk mengatur target sales.');
        }

        $defaultTarget = $request->input('default_target');
        $targets = $request->input('targets', []);

        if ($defaultTarget !== null) {
            $targetVal = (float) $defaultTarget;
            $salesUserIds = User::whereIn('role', ['Sales', 'Presales'])->pluck('id');
            foreach ($salesUserIds as $userId) {
                SalesTarget::updateOrCreate(
                    ['user_id' => $userId],
                    ['target_amount' => $targetVal]
                );
                User::where('id', $userId)->update([
                    'target_sales' => $targetVal
                ]);
            }
            return back()->with('message', 'Target default semua sales berhasil diperbarui!');
        }

        if (is_array($targets) && count($targets) > 0) {
            foreach ($targets as $item) {
                if (!empty($item['user_id']) && isset($item['target_amount'])) {
                    $targetVal = (float) $item['target_amount'];
                    SalesTarget::updateOrCreate(
                        ['user_id' => $item['user_id']],
                        ['target_amount' => $targetVal]
                    );

                    User::where('id', $item['user_id'])->update([
                        'target_sales' => $targetVal
                    ]);
                }
            }
            return back()->with('message', 'Target sales berhasil diperbarui!');
        }

        return back()->with('error', 'Data target tidak valid.');
    }
}
