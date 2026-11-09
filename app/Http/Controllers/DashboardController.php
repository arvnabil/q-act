<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Services\{DashboardScope, DashboardPurchaseOrders, PersonalDashboard, DocumentVisibility};
use App\Models\Customer;
use App\Models\User;
use App\Models\SalesOrder;
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
        abort_unless(DocumentVisibility::allows($user, 'dashboard') && DocumentVisibility::allows($user, 'dashboard_view'), 403);
        $request->validate([
            'period' => 'nullable|in:1m,3m,6m,12m,quarter,custom',
            'custom_start' => 'nullable|date_format:Y-m-d',
            'custom_end' => 'nullable|date_format:Y-m-d|after_or_equal:custom_start',
            'sales_filter' => 'nullable|string', 'personal_sales_id' => 'nullable|string',
        ]);
        $allowedUsers = DashboardScope::users($user)->where('is_active', true)->get();
        $allowedIds = $allowedUsers->pluck('id')->push($user->id)->unique();
        foreach (['sales_filter', 'personal_sales_id'] as $key) {
            if ($request->filled($key) && $request->input($key) !== 'all') {
                abort_unless($allowedIds->contains($request->input($key)), 403);
            }
        }
        $isManagerOrAdmin = $allowedIds->count() > 1;

        // Period defaults to last 6 months
        $period = $request->get('period', '6m');
        $basis = in_array($request->get('basis', 'personal'), ['quotation', 'po', 'personal'], true)
            ? $request->get('basis', 'personal')
            : 'personal';
        $customStart = $request->get('custom_start');
        $customEnd = $request->get('custom_end');
        $salesFilter = $request->get('sales_filter', 'all');

        [$periodStart, $periodEnd] = $this->getPeriodRange($period, $customStart, $customEnd);

        // =========================================================================
        // JIKA BASIS === 'PO' : BACA LANGSUNG BERDASARKAN SALES ORDER & TGL PO-NYA
        // =========================================================================
        if ($basis === 'po') {
            $soQuery = SalesOrder::with(['customer', 'sales', 'quotation'])
                ->where(function ($sq) use ($allowedIds) {
                    $sq->whereIn('sales_id', $allowedIds)->orWhereIn('created_by', $allowedIds);
                })
                ->whereNotIn(DB::raw('UPPER(COALESCE(status, ""))'), ['REVISED', 'CANCELLED', 'BATAL']);

            if ($salesFilter !== 'all') {
                $soQuery->where(function ($sq) use ($salesFilter) {
                    $sq->where('sales_id', $salesFilter)->orWhere('created_by', $salesFilter);
                });
            }

            $allSoList = $soQuery->get();
            $missingPoDateCount = 0;
            $approvedSoList = collect();

            foreach ($allSoList as $so) {
                $rawPoDate = $so->po_date ?: $so->quotation?->po_date;
                $poNumber = $so->po_number ?: $so->quotation?->po_number;
                $poStatus = $so->po_status ?: ($so->quotation?->po_status ?: 'Diterima');

                if (!$rawPoDate) {
                    $missingPoDateCount++;
                    continue;
                }

                $carbonPoDate = Carbon::parse($rawPoDate);
                if ($carbonPoDate->betweenIncluded($periodStart, $periodEnd)) {
                    // Buat object representasi PO
                    $row = (object) [
                        'id' => $so->id,
                        'quotation_id' => $so->quotation_id,
                        'date' => $so->date,
                        'po_date' => $carbonPoDate,
                        'po_number' => $poNumber,
                        'po_status' => $poStatus,
                        'grand_total' => (float) $so->grand_total,
                        'status' => $so->status,
                        'customer_id' => $so->customer_id,
                        'customer' => $so->customer,
                        'sales_id' => $so->sales_id ?: $so->created_by,
                        'sales' => $so->sales,
                    ];
                    $approvedSoList->push($row);
                }
            }

            $reportQuotations = $approvedSoList;
            $approvedReportQuotations = $approvedSoList;
            $quotations = collect();
            $tableQuotations = [];

            $tableSalesOrders = $approvedSoList->map(function ($so) {
                return [
                    'id' => $so->id,
                    'row_key' => 'so_' . $so->id,
                    'url' => '/sales-orders/' . $so->id,
                    'quotation_id' => $so->quotation_id,
                    'date' => $so->date?->toDateString(),
                    'po_number' => $so->po_number,
                    'po_date' => $so->po_date->toDateString(),
                    'po_status' => $so->po_status,
                    'grand_total' => (float) $so->grand_total,
                    'status' => $so->status,
                    'customer' => $so->customer ? ['id' => $so->customer->id, 'name' => $so->customer->name] : null,
                    'sales' => $so->sales ? ['id' => $so->sales->id, 'name' => $so->sales->name] : null,
                ];
            })->values()->all();

            $selectedPoData = [
                'missingDate' => $missingPoDateCount,
                'missingRecord' => 0,
                'invalidAllocation' => 0,
            ];
            $approvedPoQuotations = $approvedSoList;
        } else {
            // Basis Quotation / Personal: tetap dari Quotation
            $visible = DashboardScope::owned(Quotation::active()->with(['customer', 'sales', 'creator', 'items']), $allowedIds);
            $allVisibleQuotations = $visible->get();
            $salesMatchFn = function ($q) use ($salesFilter) {
                if ($salesFilter === 'all') return true;
                return ($q->sales_id === $salesFilter || $q->created_by === $salesFilter);
            };

            $selectedQuotations = $salesFilter === 'all' ? $allVisibleQuotations : $allVisibleQuotations->filter($salesMatchFn);
            $poData = app(DashboardPurchaseOrders::class)->rows($allVisibleQuotations);
            $poRows = $salesFilter === 'all' ? $poData['rows'] : $poData['rows']->filter($salesMatchFn);
            $selectedPoData = $salesFilter === 'all' ? $poData : app(DashboardPurchaseOrders::class)->rows($selectedQuotations);
            $missingPoDateCount = $selectedPoData['missingDate'];
            $approvedPoQuotations = $poRows->filter(fn ($q) => $this->poDateInRange($q, $periodStart, $periodEnd));

            $allocated = $allVisibleQuotations->filter(fn ($q) => $q->relation_type === 'split' && !in_array($q->status, ['cancelled', 'superseded']))
                ->flatMap(fn ($q) => $q->items->pluck('source_quotation_item_id'))->filter()->all();
            $quotations = $selectedQuotations->filter(fn ($q) => !in_array($q->status, ['cancelled', 'superseded']) && $q->date
                && Carbon::parse($q->date)->betweenIncluded($periodStart, $periodEnd))->map(function ($q) use ($allocated) {
                    $row = clone $q;
                    $remaining = $q->items->whereNotIn('id', $allocated);
                    if ($remaining->count() !== $q->items->count()) {
                        $row->setRelation('items', $remaining);
                        $row->subtotal = 0;
                        $row->grand_total = app(\App\Services\QuotationCalculator::class)->calculateTotals($q, $remaining)['grand_total'];
                    }
                    return $row;
                });
            $approvedQuotationQuotations = $quotations->where('status', 'approved');

            $reportQuotations = $quotations;
            $approvedReportQuotations = $approvedQuotationQuotations;

            $tableQuotations = $quotations->sortByDesc('created_at')->values()->map(function ($q) {
                return [
                    'id' => $q->id,
                    'date' => $q->date?->toDateString() ?: ($q->created_at ? Carbon::parse($q->created_at)->toDateString() : null),
                    'created_at' => $q->created_at?->toDateTimeString(),
                    'status' => $q->status,
                    'po_number' => $q->po_number,
                    'po_date' => $q->po_date?->toDateString(),
                    'grand_total' => (float) $q->grand_total,
                    'customer' => $q->customer ? ['id' => $q->customer->id, 'name' => $q->customer->name] : null,
                    'sales' => $q->sales ? ['id' => $q->sales->id, 'name' => $q->sales->name] : ($q->creator ? ['id' => $q->creator->id, 'name' => $q->creator->name] : null),
                ];
            })->toArray();
            $tableSalesOrders = [];
        }

        // KPIs
        $totalQ = $reportQuotations->count();
        $totalAllValue = $reportQuotations->sum('grand_total');
        $totalPOValue = $approvedReportQuotations->sum('grand_total');
        $approvedCount = $approvedReportQuotations->count();
        $conversionRate = $quotations->count() > 0 ? round(($approvedCount / $quotations->count()) * 100) : 0;

        // Status counts
        $statusCounts = [
            'approved' => $approvedCount,
            'sent' => $basis === 'po' ? 0 : $reportQuotations->where('status', 'sent')->count(),
            'created' => $basis === 'po' ? 0 : $reportQuotations->whereIn('status', ['created', 'draft', 'revision_draft'])->count(),
            'rejected' => $basis === 'po' ? 0 : $reportQuotations->where('status', 'rejected')->count(),
            'expired' => $basis === 'po' ? 0 : $reportQuotations->where('status', 'expired')->count(),
        ];

        // Revenue chart — monthly
        $chartMonths = $basis === 'po'
            ? $this->buildChartMonths(collect(), $approvedReportQuotations, $periodStart, $periodEnd, true)
            : $this->buildChartMonths($quotations, $approvedReportQuotations, $periodStart, $periodEnd, false);

        // Top 5 customers by PO value
        $customerMap = [];
        foreach ($reportQuotations as $q) {
            $cid = $q->customer_id ?? 'unknown';
            $name = $q->customer?->name ?? 'Customer';
            if (!isset($customerMap[$cid])) {
                $customerMap[$cid] = ['id' => $cid, 'name' => $name, 'poValue' => 0, 'poCount' => 0, 'totalQ' => 0];
            }
            $customerMap[$cid]['totalQ']++;
            if ($basis === 'quotation') {
                $customerMap[$cid]['poValue'] += $q->grand_total ?? 0;
                $customerMap[$cid]['poCount']++;
            }
        }
        foreach ($basis === 'po' ? $approvedReportQuotations : collect() as $q) {
            $cid = $q->customer_id ?? 'unknown';
            $name = $q->customer?->name ?? 'Customer';
            if (!isset($customerMap[$cid])) {
                $customerMap[$cid] = ['id' => $cid, 'name' => $name, 'poValue' => 0, 'poCount' => 0, 'totalQ' => 0];
            }
            $customerMap[$cid]['poValue'] += $q->grand_total ?? 0;
            $customerMap[$cid]['poCount']++;
        }
        usort($customerMap, fn($a, $b) => $b['poValue'] <=> $a['poValue']);
        $topCustomers = array_slice(array_values($customerMap), 0, 5);

        $salesUsers = $allowedUsers->filter(function ($u) {
            $userRole = $u->roles->first()?->name ?? $u->role;
            return $userRole === 'Sales';
        })->sortBy('name')->values();
        $salesTargets = SalesTarget::whereIn('user_id', $allowedIds)->get();
        $salesPerf = $salesUsers->map(function ($sales) use ($reportQuotations, $salesTargets) {
            $latestTarget = $salesTargets->first(fn ($t) => $t->user_id === $sales->id && (int) $t->period_year === now()->year && (int) $t->period_month === now()->month)?->target_amount
                ?? $salesTargets->where('user_id', $sales->id)->sortByDesc('created_at')->first()?->target_amount
                ?? $sales->target_sales
                ?? 0;
            $target = (float) $latestTarget;

            return [
                'id' => $sales->id,
                'name' => $sales->name,
                'avatar' => $this->getInitials($sales->name),
                'target' => $target,
                'monthly_target' => $target,
                'achieved' => $reportQuotations->filter(fn ($q) => ($q->sales_id ?: $q->created_by) === $sales->id)->sum('grand_total'),
            ];
        })->sortByDesc('achieved')->values()->toArray();

        $targetUser = $salesUsers->firstWhere('id', $request->get('personal_sales_id', $user->id))
            ?? $salesUsers->firstWhere('id', $user->id) ?? $salesUsers->first() ?? $user;
        $personalStats = $basis === 'personal' ? app(PersonalDashboard::class)->build($targetUser, ($poData['rows'] ?? collect())) : null;

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalQ' => $totalQ,
                'totalAllValue' => $totalAllValue,
                'totalPOValue' => $totalPOValue,
                'approvedCount' => $approvedCount,
                'quotationPoCount' => $approvedPoQuotations->unique('id')->count(),
                'conversionRate' => $conversionRate,
                'statusCounts' => $statusCounts,
                'chartMonths' => $chartMonths,
                'topCustomers' => $topCustomers,
                'salesPerf' => $salesPerf,
                'basis' => $basis,
                'missingPoDateCount' => $missingPoDateCount,
            ],
            'personalStats' => $personalStats,
            'dashboardAccess' => ['canSelectSales' => $isManagerOrAdmin],
            'dataQuality' => ['missingDate' => $selectedPoData['missingDate'], 'missingRecord' => $selectedPoData['missingRecord'],
                'invalidAllocation' => $selectedPoData['invalidAllocation']],
            'tableQuotations' => $basis === 'quotation' ? $tableQuotations : [],
            'tableSalesOrders' => $basis === 'po' ? $tableSalesOrders : [],
            'salesUsers' => $salesUsers->map(fn($u) => ['id' => $u->id, 'name' => $u->name, 'role' => $u->roles->first()?->name ?? $u->role])->values(),
            'filters' => [
                'period' => $period,
                'salesFilter' => $salesFilter,
                'customStart' => $customStart,
                'customEnd' => $customEnd,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
                'basis' => $basis,
                'personalSalesId' => $targetUser->id,
            ],
        ]);
    }

    private function getPeriodRange(string $period, ?string $customStart, ?string $customEnd): array
    {
        $now = now();
        if ($period === 'custom' && $customStart && $customEnd) {
            return [Carbon::parse($customStart)->startOfDay(), Carbon::parse($customEnd)->endOfDay()];
        }
        if ($period === 'quarter') {
            $quarterStartMonth = (int) (floor(($now->month - 1) / 3) * 3) + 1;
            return [
                $now->copy()->month($quarterStartMonth)->startOfMonth(),
                $now->copy()->month($quarterStartMonth + 2)->endOfMonth(),
            ];
        }
        $months = match ($period) {
            '1m' => 1, '3m' => 3, '6m' => 6, '12m' => 12, default => 6,
        };
        return [
            $now->copy()->subMonths($months - 1)->startOfMonth(),
            $now->copy()->endOfMonth(),
        ];
    }

    private function buildChartMonths($quotations, $approvedReportQuotations, Carbon $start, Carbon $end, bool $usePoDate): array
    {
        $months = [];
        $cur = $start->copy()->startOfMonth();
        while ($cur->lte($end->copy()->endOfMonth())) {
            $mStart = $cur->copy()->startOfMonth();
            $mEnd = $cur->copy()->endOfMonth();
            $label = $cur->locale('id')->translatedFormat('M y');
            $inMonth = $quotations->filter(fn($q) =>
                $q->date && $q->date >= $mStart && $q->date <= $mEnd
            );
            $revPO = $approvedReportQuotations->filter(fn($q) => $usePoDate
                ? $this->poDateInRange($q, $mStart, $mEnd)
                : $q->date && Carbon::parse($q->date)->betweenIncluded($mStart, $mEnd)
            )->sum('grand_total');
            $revNonPO = $inMonth->where('status', '!=', 'approved')->sum('grand_total');
            $months[] = ['label' => $label, 'revPO' => $revPO, 'revNonPO' => $revNonPO];
            $cur->addMonth();
        }
        return $months;
    }

    private function poDateInRange($quotation, Carbon $start, Carbon $end): bool
    {
        $date = $quotation->po_date ?? null;
        return $date && Carbon::parse($date)->betweenIncluded($start, $end);
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
        if (!DocumentVisibility::allows($user, 'sales_targets_edit')) {
            return back()->with('error', 'Anda tidak memiliki hak akses untuk mengatur target sales.');
        }

        $request->validate([
            'default_target' => 'nullable|numeric|min:0', 'targets' => 'nullable|array',
            'targets.*.user_id' => 'required|exists:users,id', 'targets.*.target_amount' => 'required|numeric|min:0',
        ]);
        $allowedTargetIds = DashboardScope::users($user)->pluck('id');
        foreach ($request->input('targets', []) as $item) abort_unless($allowedTargetIds->contains($item['user_id']), 403);
        $defaultTarget = $request->input('default_target');
        $targets = $request->input('targets', []);

        if ($defaultTarget !== null) {
            $targetVal = (float) $defaultTarget;
            $salesUserIds = DashboardScope::users($user)->where('role', 'Sales')->pluck('id');
            foreach ($salesUserIds as $userId) {
                SalesTarget::updateOrCreate(
                    ['user_id' => $userId, 'period_year' => now()->year, 'period_month' => now()->month],
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
                        ['user_id' => $item['user_id'], 'period_year' => now()->year, 'period_month' => now()->month],
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

    private function formatShortVal(float $val): string
    {
        if ($val >= 1_000_000_000) return 'Rp ' . number_format($val / 1_000_000_000, 1, ',', '.') . ' M';
        if ($val >= 1_000_000) return 'Rp ' . number_format($val / 1_000_000, 1, ',', '.') . ' jt';
        return 'Rp ' . number_format($val, 0, ',', '.');
    }
}
