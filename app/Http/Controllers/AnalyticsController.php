<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\Brand;
use App\Models\User;
use App\Models\Product;
use App\Models\SalesTarget;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Fetch active quotations with items and relations
        $quotations = Quotation::active()
            ->with(['customer', 'sales', 'creator', 'items.product.brand'])
            ->get();

        $totalQ = $quotations->count();
        $approved = $quotations->where('status', 'approved');
        $sent = $quotations->where('status', 'sent');
        $created = $quotations->whereIn('status', ['created', 'draft']);
        $rejected = $quotations->where('status', 'rejected');
        $expired = $quotations->where('status', 'expired');

        $totalRevenue = (float) $approved->sum('grand_total');
        $pipelineRevenue = (float) $sent->concat($created)->sum('grand_total');
        $lostRevenue = (float) $rejected->concat($expired)->sum('grand_total');
        $convRate = $totalQ > 0 ? (int) round(($approved->count() / $totalQ) * 100) : 0;
        $avgDealSize = $approved->count() > 0 ? (float) round($totalRevenue / $approved->count()) : 0;

        // 2. Trend Revenue 6 bulan terakhir
        $now = now();
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = $now->copy()->subMonths($i);
            $mStart = $monthDate->copy()->startOfMonth();
            $mEnd = $monthDate->copy()->endOfMonth();

            $qInMonth = $quotations->filter(fn($q) => $q->created_at && $q->created_at >= $mStart && $q->created_at <= $mEnd);
            $approvedInMonth = $qInMonth->where('status', 'approved');

            $monthlyTrend[] = [
                'month'      => $monthDate->locale('id')->translatedFormat('M'),
                'revenue'    => (float) $approvedInMonth->sum('grand_total'),
                'quotations' => $qInMonth->count(),
                'approved'   => $approvedInMonth->count(),
            ];
        }

        // 3. Funnel Quotation
        $totalSentOrApproved = $sent->count() + $approved->count();
        $sentPct = $totalQ > 0 ? (int) round(($totalSentOrApproved / $totalQ) * 100) : 0;
        $funnel = [
            ['label' => 'Total Dibuat', 'count' => $totalQ, 'pct' => 100, 'color' => 'bg-blue-600'],
            ['label' => 'Dikirim ke Customer', 'count' => $totalSentOrApproved, 'pct' => $sentPct, 'color' => 'bg-purple-600'],
            ['label' => 'PO', 'count' => $approved->count(), 'pct' => $convRate, 'color' => 'bg-emerald-500'],
        ];

        // 4. Performa per Brand
        $brands = Brand::orderBy('name')->get();
        $brandPerf = $brands->map(function ($b) use ($quotations) {
            $brandQ = $quotations->filter(function ($q) use ($b) {
                return $q->items->contains(function ($item) use ($b) {
                    $bName = $item->brand ?: ($item->product?->brand?->name ?? '');
                    return strtolower(trim($bName)) === strtolower(trim($b->name));
                });
            });
            $brandApproved = $brandQ->where('status', 'approved');
            $revenue = (float) $brandApproved->sum('grand_total');
            $bConv = $brandQ->count() > 0 ? (int) round(($brandApproved->count() / $brandQ->count()) * 100) : 0;

            return [
                'id'            => $b->id,
                'name'          => $b->name,
                'color'         => $b->color_hex ?: '#6366f1',
                'quoCount'      => $brandQ->count(),
                'approvedCount' => $brandApproved->count(),
                'revenue'       => $revenue,
                'convRate'      => $bConv,
            ];
        })->sortByDesc('revenue')->values()->toArray();

        // 5. Sales Leaderboard
        $salesUsers = User::whereIn('role', ['Sales', 'Presales'])->where('is_active', true)->orderBy('name')->get();
        $salesTargets = SalesTarget::pluck('target_amount', 'user_id')->toArray();
        $defaultTarget = 600_000_000;

        $salesLeaderboard = $salesUsers->map(function ($s) use ($quotations, $salesTargets, $defaultTarget) {
            $userQ = $quotations->filter(fn($q) => $q->sales_id === $s->id || $q->created_by === $s->id);
            $userApp = $userQ->where('status', 'approved');
            $revenue = (float) $userApp->sum('grand_total');
            $conv = $userQ->count() > 0 ? (int) round(($userApp->count() / $userQ->count()) * 100) : 0;
            $target = $salesTargets[$s->id] ?? $defaultTarget;

            $parts = explode(' ', trim($s->name));
            $avatar = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));

            return [
                'id'       => $s->id,
                'name'     => $s->name,
                'role'     => $s->role,
                'avatar'   => $avatar,
                'quo'      => $userQ->count(),
                'approved' => $userApp->count(),
                'conv'     => $conv,
                'revenue'  => $revenue,
                'target'   => $target,
            ];
        })->sortByDesc('revenue')->values()->toArray();

        // 6. Top 8 Produk Terlaris
        $productMap = [];
        foreach ($quotations as $q) {
            foreach ($q->items as $item) {
                $sku = $item->sku ?: ($item->product?->sku ?: 'SKU');
                $name = $item->name ?: ($item->product?->name ?: 'Produk');
                $brand = $item->brand ?: ($item->product?->brand?->name ?: 'Brand');
                $price = (float) ($item->price ?: 0);
                $qty = (int) ($item->qty ?: 0);
                $key = $sku . '_' . $name;

                if (!isset($productMap[$key])) {
                    $productMap[$key] = [
                        'sku'     => $sku,
                        'name'    => $name,
                        'brand'   => $brand,
                        'price'   => $price,
                        'qty'     => 0,
                        'revenue' => 0,
                    ];
                }
                $productMap[$key]['qty'] += $qty;
                if ($q->status === 'approved') {
                    $productMap[$key]['revenue'] += ($qty * $price);
                }
            }
        }
        usort($productMap, fn($a, $b) => ($b['revenue'] <=> $a['revenue']) ?: ($b['qty'] <=> $a['qty']));
        $topProducts = array_slice(array_values($productMap), 0, 8);

        return Inertia::render('Analytics', [
            'metrics' => [
                'totalQ'           => $totalQ,
                'totalRevenue'     => $totalRevenue,
                'pipelineRevenue'  => $pipelineRevenue,
                'lostRevenue'      => $lostRevenue,
                'convRate'         => $convRate,
                'avgDealSize'      => $avgDealSize,
                'monthlyTrend'     => $monthlyTrend,
                'funnel'           => $funnel,
                'brandPerf'        => $brandPerf,
                'salesLeaderboard' => $salesLeaderboard,
                'topProducts'      => $topProducts,
            ],
        ]);
    }
}
