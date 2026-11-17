<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\ZoomSubAccount;
use App\Models\ZoomSubAccountDetail;
use App\Models\ZoomSubAccountSyncRun;
use App\Services\ZoomService;
use App\Services\ZoomSubAccountSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ZoomSubAccountController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $matchFilter = $request->input('match', 'all');
        $presenceFilter = $request->input('presence', 'present');

        $query = ZoomSubAccount::query()->with(['customer:id,name', 'matcher:id,name']);

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('account_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('zoom_account_id', 'like', "%{$search}%")
                    ->orWhere('owner_email', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%"));
            });
        }

        if ($matchFilter === 'matched') {
            $query->whereNotNull('customer_id');
        } elseif ($matchFilter === 'unmatched') {
            $query->whereNull('customer_id');
        }

        if ($presenceFilter === 'missing') {
            $query->where('is_present', false);
        } elseif ($presenceFilter === 'present') {
            $query->where('is_present', true);
        }

        $canMatchCustomers = $request->user()->can('zoom_sub_accounts_match');
        // Keep portal-style newest-first ordering based on Zoom's creation timestamp.
        $subAccounts = $query->orderByDesc('zoom_created_at')->orderBy('account_name')->paginate(25)->withQueryString();
        $subAccounts->through(fn (ZoomSubAccount $subAccount) => [
            'id' => $subAccount->id,
            'zoom_account_id' => $subAccount->zoom_account_id,
            'zoom_created_at' => $subAccount->zoom_created_at,
            'account_name' => $subAccount->account_name,
            'account_number' => $subAccount->account_number,
            'account_type' => $subAccount->account_type,
            'owner_email' => $subAccount->owner_email,
            'seats' => $subAccount->seats,
            'bulk_license' => $subAccount->bulk_license,
            'is_sub_reseller' => $subAccount->is_sub_reseller,
            'subscription_start_time' => $subAccount->subscription_start_time?->toDateString(),
            'subscription_end_time' => $subAccount->subscription_end_time?->toDateString(),
            'is_present' => $subAccount->is_present,
            'last_seen_at' => $subAccount->last_seen_at,
            'customer' => $subAccount->customer?->only(['id', 'name']),
            'matcher' => $subAccount->matcher?->only(['id', 'name']),
            'matched_at' => $subAccount->matched_at,
            'suggestions' => ! $canMatchCustomers || $subAccount->customer_id
                ? []
                : $this->suggestCustomers($subAccount->account_name),
        ]);

        $lastRun = ZoomSubAccountSyncRun::with('triggeredBy:id,name')->latest('started_at')->first();

        return Inertia::render('Zoom/SubAccountList', [
            'subAccounts' => $subAccounts,
            'syncRuns' => ZoomSubAccountSyncRun::with('triggeredBy:id,name')
                ->latest('started_at')
                ->limit(10)
                ->get(),
            'summary' => [
                'total' => ZoomSubAccount::where('is_present', true)->count(),
                'matched' => ZoomSubAccount::where('is_present', true)->whereNotNull('customer_id')->count(),
                'unmatched' => ZoomSubAccount::where('is_present', true)->whereNull('customer_id')->count(),
                'last_sync_at' => $lastRun?->finished_at,
                'last_sync_status' => $lastRun?->status,
            ],
            'filters' => [
                'search' => $search,
                'match' => $matchFilter,
                'presence' => $presenceFilter,
            ],
            'zoomConfigured' => app(ZoomService::class)->isConfigured(),
            'canSync' => $request->user()->can('zoom_sub_accounts_sync'),
            'canMatchCustomers' => $canMatchCustomers,
            'canViewDetails' => $request->user()->can('zoom_sub_accounts_details'),
        ]);
    }

    public function show(Request $request, ZoomSubAccount $zoomSubAccount, ZoomService $zoomService): Response
    {
        $tab = $request->string('tab', 'account')->toString();
        abort_unless(in_array($tab, ['account', 'current-plans', 'pending-plans', 'billing'], true), 404);

        if ($tab === 'billing') {
            abort_unless($request->user()->can('zoom_sub_accounts_billing'), 403);
        }

        $refresh = $request->boolean('refresh');
        $details = null;
        $plans = null;
        $billing = null;
        if ($tab === 'account') {
            $details = $this->cachedZoomDetail($zoomSubAccount, 'account', 'account', $zoomService, $refresh);
        } elseif ($tab === 'current-plans') {
            $plans = $this->cachedZoomDetail($zoomSubAccount, 'plans', 'plans', $zoomService, $refresh);
        } elseif ($tab === 'pending-plans') {
            $plans = $this->cachedZoomDetail($zoomSubAccount, 'usage', 'usage', $zoomService, $refresh);
        } else {
            $billing = $this->cachedZoomDetail($zoomSubAccount, 'billing', 'billing', $zoomService, $refresh);
        }

        return Inertia::render('Zoom/SubAccountDetail', [
            'account' => [
                'id' => $zoomSubAccount->id,
                'zoom_account_id' => $zoomSubAccount->zoom_account_id,
                'account_name' => $zoomSubAccount->account_name,
                'account_number' => $zoomSubAccount->account_number,
                'account_type' => $zoomSubAccount->account_type,
                'owner_email' => $zoomSubAccount->owner_email,
                'seats' => $zoomSubAccount->seats,
                'bulk_license' => $zoomSubAccount->bulk_license,
                'is_sub_reseller' => $zoomSubAccount->is_sub_reseller,
                'zoom_created_at' => $zoomSubAccount->zoom_created_at,
                'subscription_start_time' => $zoomSubAccount->subscription_start_time,
                'subscription_end_time' => $zoomSubAccount->subscription_end_time,
                'customer' => $zoomSubAccount->customer?->only(['id', 'name']),
            ],
            'tab' => $tab,
            'details' => $details,
            'plans' => $plans,
            'billing' => $billing,
            'canViewBilling' => $request->user()->can('zoom_sub_accounts_billing'),
        ]);
    }

    private function cachedZoomDetail(
        ZoomSubAccount $subAccount,
        string $cacheType,
        string $endpoint,
        ZoomService $zoomService,
        bool $refresh
    ): array {
        $cache = ZoomSubAccountDetail::query()
            ->where('zoom_account_id', $subAccount->zoom_account_id)
            ->where('detail_type', $cacheType)
            ->first();

        if ($cache && ! $refresh) {
            return [
                'available' => true,
                'data' => $cache->payload,
                'message' => null,
                'cached' => true,
                'fetched_at' => $cache->fetched_at,
            ];
        }

        $result = $zoomService->readSubAccount($subAccount->zoom_account_id, $endpoint);
        if ($result['available']) {
            $cache = ZoomSubAccountDetail::query()->updateOrCreate(
                ['zoom_account_id' => $subAccount->zoom_account_id, 'detail_type' => $cacheType],
                ['payload' => $result['data'], 'fetched_at' => now()]
            );

            return [
                ...$result,
                'cached' => false,
                'fetched_at' => $cache->fetched_at,
            ];
        }

        if ($cache) {
            return [
                'available' => true,
                'data' => $cache->payload,
                'message' => null,
                'cached' => true,
                'fetched_at' => $cache->fetched_at,
                'refresh_error' => $result['message'],
            ];
        }

        return [...$result, 'cached' => false, 'fetched_at' => null];
    }

    public function sync(Request $request, ZoomSubAccountSyncService $syncService): RedirectResponse
    {
        $lock = Cache::lock('zoom-sub-account-sync', 900);
        if (! $lock->get()) {
            return back()->with('error', 'Sinkronisasi Zoom sedang berjalan. Tunggu sampai proses selesai.');
        }

        try {
            $run = $syncService->sync($request->user());
        } finally {
            $lock->release();
        }

        if ($run->status !== 'completed') {
            return back()->with('error', $run->error_message ?: 'Sinkronisasi Zoom gagal.');
        }

        return back()->with('message', "Sinkronisasi selesai: {$run->accounts_seen} akun diperiksa, {$run->accounts_added} baru, {$run->accounts_updated} diperbarui.");
    }

    public function searchCustomers(Request $request): JsonResponse
    {
        $validated = $request->validate(['search' => ['required', 'string', 'min:2', 'max:100']]);
        $search = trim($validated['search']);

        $customers = Customer::query()
            ->where('name', 'like', "%{$search}%")
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'name']);

        return response()->json($customers);
    }

    public function updateCustomerMatch(Request $request, ZoomSubAccount $zoomSubAccount): RedirectResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'string', 'exists:customers,id'],
        ]);
        $newCustomer = ! empty($data['customer_id']) ? Customer::find($data['customer_id']) : null;

        DB::transaction(function () use ($request, $zoomSubAccount, $data, $newCustomer) {
            $zoomSubAccount = ZoomSubAccount::query()->lockForUpdate()->findOrFail($zoomSubAccount->id);
            $oldCustomerName = $zoomSubAccount->customer?->name;
            $zoomSubAccount->update([
                'customer_id' => $data['customer_id'] ?? null,
                'matched_by' => $newCustomer ? $request->user()->id : null,
                'matched_at' => $newCustomer ? now() : null,
            ]);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => $newCustomer ? 'ZOOM_SUB_ACCOUNT_CUSTOMER_MATCHED' : 'ZOOM_SUB_ACCOUNT_CUSTOMER_UNLINKED',
                'entity_type' => 'ZOOM_SUB_ACCOUNT',
                'entity_id' => $zoomSubAccount->zoom_account_id,
                'description' => $newCustomer
                    ? "Zoom sub-account {$zoomSubAccount->account_name} dikaitkan dengan customer {$newCustomer->name}."
                    : "Kaitan customer {$oldCustomerName} dihapus dari Zoom sub-account {$zoomSubAccount->account_name}.",
            ]);
        });

        return back()->with('message', $newCustomer
            ? "Sub-account dikaitkan dengan customer {$newCustomer->name}."
            : 'Kaitan customer berhasil dihapus.');
    }

    private function suggestCustomers(?string $accountName): array
    {
        $normalizedAccountName = $this->normalizeName($accountName ?? '');
        if ($normalizedAccountName === '') {
            return [];
        }

        $tokens = collect(explode(' ', $normalizedAccountName))
            ->filter(fn (string $token) => mb_strlen($token) >= 3)
            ->take(4)
            ->values();
        if ($tokens->isEmpty()) {
            return [];
        }

        $customers = Customer::query()
            ->where(function ($query) use ($tokens) {
                foreach ($tokens as $token) {
                    $query->orWhere('name', 'like', "%{$token}%");
                }
            })
            ->limit(100)
            ->get(['id', 'name']);

        return $customers
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'score' => $this->nameSimilarity($normalizedAccountName, $this->normalizeName($customer->name)),
            ])
            ->filter(fn (array $candidate) => $candidate['score'] >= 45)
            ->sortByDesc('score')
            ->take(3)
            ->values()
            ->map(fn (array $candidate) => [...$candidate, 'score' => round($candidate['score'])])
            ->all();
    }

    private function normalizeName(string $value): string
    {
        $value = mb_strtolower($value, 'UTF-8');
        $value = preg_replace('/\b(pt|cv|tbk|persero|perseroan|ltd|limited|inc)\b/u', ' ', $value) ?? $value;
        $value = preg_replace('/[^\pL\pN]+/u', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }

    private function nameSimilarity(string $left, string $right): float
    {
        if ($left === '' || $right === '') {
            return 0;
        }
        if ($left === $right) {
            return 100;
        }

        similar_text($left, $right, $characterSimilarity);
        $leftTokens = array_values(array_unique(explode(' ', $left)));
        $rightTokens = array_values(array_unique(explode(' ', $right)));
        $overlap = count(array_intersect($leftTokens, $rightTokens));
        $tokenSimilarity = $overlap / max(count($leftTokens), count($rightTokens)) * 100;

        if (mb_strlen($left) >= 4 && (str_contains($left, $right) || str_contains($right, $left))) {
            $characterSimilarity = max($characterSimilarity, 78);
        }

        return max($characterSimilarity, $tokenSimilarity * 0.9);
    }
}
