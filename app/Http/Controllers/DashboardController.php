<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
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
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);

        // Period defaults to last 6 months
        $period = $request->get('period', '6m');
        $basis = in_array($request->get('basis', 'personal'), ['quotation', 'po', 'personal'], true)
            ? $request->get('basis', 'personal')
            : 'personal';
        $customStart = $request->get('custom_start');
        $customEnd = $request->get('custom_end');
        $salesFilter = $request->get('sales_filter', 'all');

        [$periodStart, $periodEnd] = $this->getPeriodRange($period, $customStart, $customEnd);

        // Quotation pipeline follows quotation creation date.
        $quotationQuery = Quotation::active()
            ->with(['customer', 'sales', 'creator', 'items'])
            ->whereBetween('created_at', [$periodStart, $periodEnd]);

        if ($salesFilter !== 'all') {
            $quotationQuery->where(function ($q) use ($salesFilter) {
                $q->where('sales_id', $salesFilter)
                  ->orWhere('created_by', $salesFilter);
            });
        }

        $quotations = $quotationQuery->get();

        // PO revenue follows the manually entered PO date. This allows a
        // quotation created in an earlier period to be reported in the quarter
        // where the customer actually issued the PO.
        $approvedPoQuery = Quotation::active()
            ->with(['customer', 'sales', 'creator', 'items'])
            ->where('status', 'approved')
            ->whereBetween('po_date', [$periodStart->toDateString(), $periodEnd->toDateString()]);

        if ($salesFilter !== 'all') {
            $approvedPoQuery->where(function ($q) use ($salesFilter) {
                $q->where('sales_id', $salesFilter)->orWhere('created_by', $salesFilter);
            });
        }

        $approvedPoQuotations = $approvedPoQuery->get();

        // Existing approved records without PO date are intentionally excluded
        // from PO reporting until their metadata is completed from the SO.
        $missingPoDateQuery = Quotation::active()
            ->where('status', 'approved')
            ->whereNull('po_date');
        if ($salesFilter !== 'all') {
            $missingPoDateQuery->where(function ($q) use ($salesFilter) {
                $q->where('sales_id', $salesFilter)->orWhere('created_by', $salesFilter);
            });
        }
        $missingPoDateCount = $missingPoDateQuery->count();
        $approvedQuotationQuotations = $quotations->where('status', 'approved');

        // The selected dashboard tab is the reporting source of truth. The
        // quotation tab uses created_at; the PO tab uses the manually entered
        // PO date and excludes records where that date is still missing.
        $reportQuotations = $basis === 'po' ? $approvedPoQuotations : $quotations;
        $approvedReportQuotations = $basis === 'po' ? $approvedPoQuotations : $approvedQuotationQuotations;

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
            'created' => $basis === 'po' ? 0 : $reportQuotations->whereIn('status', ['created', 'draft'])->count(),
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

        // Sales users & performance
        $salesUsers = User::whereIn('role', ['Sales', 'Presales'])->where('is_active', true)->get();
        $salesTargets = SalesTarget::pluck('target_amount', 'user_id')->toArray();
        $defaultTarget = 600_000_000;

        // Build salesPerf (all active quotations in system)
        $allQuotations = Quotation::active()->with('items')->get();

        $salesPerf = $salesUsers->map(function ($s) use ($allQuotations, $salesTargets, $defaultTarget, $periodStart, $periodEnd, $basis) {
            $userQ = $allQuotations->filter(fn($q) =>
                $q->sales_id === $s->id || $q->created_by === $s->id
            );
            $achieved = $basis === 'po'
                ? $userQ->filter(fn($q) => $q->status === 'approved' && $this->poDateInRange($q, $periodStart, $periodEnd))->sum('grand_total')
                : $userQ->filter(fn($q) => $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($periodStart, $periodEnd))->sum('grand_total');
            $target = $salesTargets[$s->id] ?? $defaultTarget;

            return [
                'id' => $s->id,
                'name' => $s->name,
                'avatar' => $this->getInitials($s->name),
                'target' => $target,
                'achieved' => $achieved,
            ];
        })->sortByDesc('achieved')->values()->toArray();

        // Prepare table data for Dashboard Quotation
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

        // Prepare table data for Dashboard PO (Sales Orders)
        $approvedPoQuotationIds = $approvedPoQuotations->pluck('id');
        $soQuery = SalesOrder::with(['customer', 'sales', 'creator', 'quotation.purchaseOrders'])
            ->where(function ($q) use ($periodStart, $periodEnd, $approvedPoQuotationIds) {
                $q->whereBetween('po_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                  ->orWhereIn('quotation_id', $approvedPoQuotationIds);
            });

        if ($salesFilter !== 'all') {
            $soQuery->where('sales_id', $salesFilter);
        }

        $tableSalesOrders = $soQuery->orderByDesc('date')->orderByDesc('created_at')->get()->map(function ($so) {
            $latestPo = $so->quotation?->purchaseOrders?->sortByDesc('created_at')->first();
            $poNumber = $so->po_number ?: $latestPo?->po_number ?: $so->quotation?->po_number;
            $poDate = $so->po_date?->toDateString() ?: $latestPo?->po_date?->toDateString() ?: $so->quotation?->po_date?->toDateString();
            $poStatus = $so->po_status ?: $latestPo?->status ?: $so->quotation?->po_status ?: 'Diterima';

            return [
                'id' => $so->id,
                'quotation_id' => $so->quotation_id,
                'date' => $so->date?->toDateString(),
                'po_number' => $poNumber,
                'po_date' => $poDate,
                'po_status' => $poStatus,
                'grand_total' => (float) $so->grand_total,
                'status' => $so->status,
                'customer' => $so->customer ? ['id' => $so->customer->id, 'name' => $so->customer->name] : null,
                'sales' => $so->sales ? ['id' => $so->sales->id, 'name' => $so->sales->name] : null,
            ];
        })->values()->toArray();

        $personalStats = $this->getPersonalDashboardData($user, $request, $isManagerOrAdmin);

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
                'basis' => $basis,
                'missingPoDateCount' => $missingPoDateCount,
            ],
            'personalStats' => $personalStats,
            'tableQuotations' => $tableQuotations,
            'tableSalesOrders' => $tableSalesOrders,
            'salesUsers' => $salesUsers->map(fn($u) => ['id' => $u->id, 'name' => $u->name])->values(),
            'filters' => [
                'period' => $period,
                'salesFilter' => $salesFilter,
                'customStart' => $customStart,
                'customEnd' => $customEnd,
                'periodStart' => $periodStart->toDateString(),
                'periodEnd' => $periodEnd->toDateString(),
                'basis' => $basis,
                'personalSalesId' => $request->get('personal_sales_id', $user->id),
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
                $q->created_at && $q->created_at >= $mStart && $q->created_at <= $mEnd
            );
            $revPO = $approvedReportQuotations->filter(fn($q) => $usePoDate
                ? $this->poDateInRange($q, $mStart, $mEnd)
                : $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($mStart, $mEnd)
            )->sum('grand_total');
            $revNonPO = $inMonth->where('status', '!=', 'approved')->sum('grand_total');
            $months[] = ['label' => $label, 'revPO' => $revPO, 'revNonPO' => $revNonPO];
            $cur->addMonth();
        }
        return $months;
    }

    private function poDateInRange(Quotation $quotation, Carbon $start, Carbon $end): bool
    {
        $date = $quotation->po_date;
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

    private function getPersonalDashboardData(User $user, Request $request, bool $isManagerOrAdmin): array
    {
        $targetUserId = ($isManagerOrAdmin && $request->filled('personal_sales_id'))
            ? $request->get('personal_sales_id')
            : $user->id;

        $targetUser = User::find($targetUserId) ?? $user;

        $userQuotations = Quotation::active()
            ->with(['customer', 'pic', 'items'])
            ->where(function ($q) use ($targetUser) {
                $q->where('sales_id', $targetUser->id)
                  ->orWhere('created_by', $targetUser->id);
            })
            ->get();

        $salesTargetAmount = SalesTarget::where('user_id', $targetUser->id)->value('target_amount')
            ?? (float) ($targetUser->target_sales ?? 600_000_000);
        if ($salesTargetAmount <= 0) {
            $salesTargetAmount = 600_000_000;
        }

        $now = now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $endOfThisMonth = $now->copy()->endOfMonth();

        // Deals won this month
        $wonThisMonth = $userQuotations->where('status', 'approved')->filter(function ($q) use ($startOfThisMonth, $endOfThisMonth) {
            if ($q->po_date) {
                return Carbon::parse($q->po_date)->betweenIncluded($startOfThisMonth, $endOfThisMonth);
            }
            return $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($startOfThisMonth, $endOfThisMonth);
        });

        $revenueThisMonth = (float) $wonThisMonth->sum('grand_total');
        $dealsWonThisMonth = $wonThisMonth->count();

        $lostThisMonth = $userQuotations->whereIn('status', ['rejected', 'expired'])->filter(function ($q) use ($startOfThisMonth, $endOfThisMonth) {
            return $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($startOfThisMonth, $endOfThisMonth);
        });
        $dealsLostThisMonth = $lostThisMonth->count();

        $targetPct = $salesTargetAmount > 0 ? round(($revenueThisMonth / $salesTargetAmount) * 100, 1) : 0;

        // Forecast pipeline (open active quotations)
        $openQuotations = $userQuotations->whereIn('status', ['sent', 'created', 'draft']);
        $forecastPipeline = (float) $openQuotations->sum('grand_total');

        // Last 6 months data for charts
        $monthlyRevenueLast6 = [];
        $monthlyTrendsLast6 = [];

        for ($i = 5; $i >= 0; $i--) {
            $mStart = $now->copy()->subMonths($i)->startOfMonth();
            $mEnd = $now->copy()->subMonths($i)->endOfMonth();
            $label = $mStart->locale('id')->translatedFormat('M');

            $newLeads = $userQuotations->filter(function ($q) use ($mStart, $mEnd) {
                return $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($mStart, $mEnd);
            });

            $wonInMonth = $userQuotations->where('status', 'approved')->filter(function ($q) use ($mStart, $mEnd) {
                if ($q->po_date) {
                    return Carbon::parse($q->po_date)->betweenIncluded($mStart, $mEnd);
                }
                return $q->created_at && Carbon::parse($q->created_at)->betweenIncluded($mStart, $mEnd);
            });

            $revInMonth = (float) $wonInMonth->sum('grand_total');

            $monthlyRevenueLast6[] = [
                'month' => $label,
                'year' => $mStart->format('Y'),
                'revenue' => $revInMonth,
                'deals' => $wonInMonth->count(),
            ];

            $monthlyTrendsLast6[] = [
                'month' => $label,
                'leads' => $newLeads->count(),
                'deals' => $wonInMonth->count(),
                'revenue' => $revInMonth,
            ];
        }

        // All-time performance
        $allTimeTotalLeads = $userQuotations->count();
        $allTimeWon = $userQuotations->where('status', 'approved')->count();
        $allTimeLost = $userQuotations->whereIn('status', ['rejected', 'expired'])->count();
        $allTimeRevenue = (float) $userQuotations->where('status', 'approved')->sum('grand_total');
        $allTimeWinRate = $allTimeTotalLeads > 0 ? round(($allTimeWon / $allTimeTotalLeads) * 100, 1) : 0;

        // Pipeline Review & Follow-up
        $needsFollowUpQuotations = $userQuotations->whereIn('status', ['sent', 'created']);
        $needsFollowUpCount = $needsFollowUpQuotations->count();

        $today = Carbon::today();
        $endOfWeek = $now->copy()->endOfWeek();

        $expiringSoon = $needsFollowUpQuotations->filter(function ($q) use ($today, $endOfWeek) {
            if (!$q->expired) return false;
            $exp = Carbon::parse($q->expired);
            return $exp->lte($endOfWeek);
        });

        $nextFollowUp = $needsFollowUpQuotations->sortBy(function ($q) {
            return $q->expired ? Carbon::parse($q->expired)->timestamp : 9999999999;
        })->first();

        $nextCustomerName = $nextFollowUp?->customer?->name ?? ($needsFollowUpQuotations->first()?->customer?->name ?? null);

        // Upcoming tasks
        $upcomingTasks = $needsFollowUpQuotations->sortBy(function ($q) {
            return $q->expired ? Carbon::parse($q->expired)->timestamp : 9999999999;
        })->take(5)->map(function ($q) use ($today) {
            $daysLeft = $q->expired ? $today->diffInDays(Carbon::parse($q->expired), false) : null;
            $priority = 'Normal';
            if ($daysLeft !== null && $daysLeft <= 0) {
                $priority = 'Hari ini';
            } elseif ($daysLeft !== null && $daysLeft <= 3) {
                $priority = 'Prioritas';
            } elseif ($q->grand_total >= 50_000_000) {
                $priority = 'Prioritas';
            }

            $action = $q->status === 'sent' ? 'FOLLOW-UP QUOTATION' : 'KONFIRMASI DRAFT';

            return [
                'id' => $q->id,
                'action' => $action,
                'customer' => $q->customer?->name ?? 'Pelanggan',
                'pic' => $q->pic?->name ?? '-',
                'grand_total' => (float) $q->grand_total,
                'status' => $q->status,
                'expired' => $q->expired?->toDateString(),
                'days_left' => $daysLeft,
                'priority' => $priority,
            ];
        })->values()->toArray();

        // Contextual Smart Recommendation
        $smartTipMessage = 'Fokus pada follow-up penawaran yang paling berpeluang menghasilkan deal bulan ini.';
        if (count($upcomingTasks) > 0) {
            $firstTask = $upcomingTasks[0];
            $formattedVal = $this->formatShortVal($firstTask['grand_total']);
            $smartTipMessage = "Prioritaskan follow-up {$firstTask['customer']} ({$firstTask['id']}) senilai {$formattedVal} untuk percepatan closing deal.";
        } elseif ($needsFollowUpCount > 0) {
            $smartTipMessage = "Terdapat {$needsFollowUpCount} penawaran berstatus aktif yang membutuhkan follow-up terencana minggu ini.";
        }

        return [
            'targetUser' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'role' => $targetUser->role,
            ],
            'revenueThisMonth' => $revenueThisMonth,
            'dealsWonThisMonth' => $dealsWonThisMonth,
            'dealsLostThisMonth' => $dealsLostThisMonth,
            'targetAmount' => $salesTargetAmount,
            'targetPct' => $targetPct,
            'forecastPipeline' => $forecastPipeline,
            'monthlyRevenueLast6' => $monthlyRevenueLast6,
            'monthlyTrendsLast6' => $monthlyTrendsLast6,
            'allTime' => [
                'totalLeads' => $allTimeTotalLeads,
                'dealsWon' => $allTimeWon,
                'dealsLost' => $allTimeLost,
                'winRate' => $allTimeWinRate,
                'totalRevenue' => $allTimeRevenue,
            ],
            'pipelineReview' => [
                'totalLeads' => $allTimeTotalLeads,
                'dealsWon' => $allTimeWon,
                'dealsLost' => $allTimeLost,
                'needsFollowUp' => $needsFollowUpCount,
                'todayAgenda' => $expiringSoon->count(),
                'nextCustomer' => $nextCustomerName,
                'dealsThisMonth' => $dealsWonThisMonth,
                'monthWinRate' => ($dealsWonThisMonth + $dealsLostThisMonth) > 0
                    ? round(($dealsWonThisMonth / ($dealsWonThisMonth + $dealsLostThisMonth)) * 100)
                    : ($allTimeTotalLeads > 0 ? $allTimeWinRate : 0),
            ],
            'smartTip' => [
                'title' => 'Rekomendasi Hari Ini',
                'message' => $smartTipMessage,
            ],
            'upcomingTasks' => $upcomingTasks,
        ];
    }

    private function formatShortVal(float $val): string
    {
        if ($val >= 1_000_000_000) return 'Rp ' . number_format($val / 1_000_000_000, 1, ',', '.') . ' M';
        if ($val >= 1_000_000) return 'Rp ' . number_format($val / 1_000_000, 1, ',', '.') . ' jt';
        return 'Rp ' . number_format($val, 0, ',', '.');
    }
}
