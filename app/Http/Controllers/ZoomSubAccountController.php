<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\ZoomSubAccount;
use App\Models\ZoomSubAccountDetail;
use App\Models\ZoomSubAccountSyncRun;
use App\Services\ZoomService;
use App\Services\ZoomSubAccountSyncService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;
use Inertia\Response;

class ZoomSubAccountController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $matchFilter = $request->input('match', 'all');
        $presenceFilter = $request->input('presence', 'present');
        $expiryFilter = $request->input('expiry', 'all');

        $query = ZoomSubAccount::query()->with(['customer:id,name', 'matcher:id,name', 'salesPic:id,name,email']);

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

        $today = now()->startOfDay();
        $this->applyExpiryFilter($query, $expiryFilter, $today);

        $canMatchCustomers = $request->user()->can('zoom_sub_accounts_match');
        // Keep portal-style newest-first ordering based on Zoom's creation timestamp.
        $subAccounts = $query->orderByDesc('zoom_created_at')->orderBy('account_name')->paginate(25)->withQueryString();

        // The account-detail endpoint can have a newer, more complete snapshot than
        // the paginated account-list endpoint. Apply that snapshot before rendering
        // the list so returning from Details cannot leave a stale account type here.
        $detailCaches = ZoomSubAccountDetail::query()
            ->whereIn('zoom_account_id', $subAccounts->getCollection()->pluck('zoom_account_id'))
            ->where('detail_type', 'account')
            ->get()
            ->keyBy('zoom_account_id');

        foreach ($subAccounts->getCollection() as $subAccount) {
            $detailCache = $detailCaches->get($subAccount->zoom_account_id);
            if ($detailCache) {
                $details = (array) $detailCache->payload;
                $this->syncAccountTypeFromDetails($subAccount, $details);

                if (! $subAccount->last_seen_at || ! $detailCache->fetched_at || $detailCache->fetched_at->greaterThanOrEqualTo($subAccount->last_seen_at)) {
                    $this->syncAccountSummaryFromDetails($subAccount, $details);
                }
            }
        }

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
            'sales_pic' => $subAccount->salesPic?->only(['id', 'name', 'email']),
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
                'expiring_30' => ZoomSubAccount::where('is_present', true)->whereDate('subscription_end_time', '>=', $today->toDateString())->whereDate('subscription_end_time', '<=', $today->copy()->addDays(30)->toDateString())->count(),
                'expiring_60' => ZoomSubAccount::where('is_present', true)->whereDate('subscription_end_time', '>', $today->copy()->addDays(30)->toDateString())->whereDate('subscription_end_time', '<=', $today->copy()->addDays(60)->toDateString())->count(),
                'expiring_90' => ZoomSubAccount::where('is_present', true)->whereDate('subscription_end_time', '>', $today->copy()->addDays(60)->toDateString())->whereDate('subscription_end_time', '<=', $today->copy()->addDays(90)->toDateString())->count(),
                'last_sync_at' => $lastRun?->finished_at,
                'last_sync_status' => $lastRun?->status,
            ],
            'filters' => [
                'search' => $search,
                'match' => $matchFilter,
                'presence' => $presenceFilter,
                'expiry' => $expiryFilter,
            ],
            'zoomConfigured' => app(ZoomService::class)->isConfigured(),
            'canSync' => $request->user()->can('zoom_sub_accounts_sync'),
            'canMatchCustomers' => $canMatchCustomers,
            'canViewDetails' => $request->user()->can('zoom_sub_accounts_details'),
            'salesUsers' => $canMatchCustomers ? \App\Models\User::query()
                ->where('is_active', true)
                ->where(function ($query) {
                    $query->whereIn('role', ['Sales', 'Presales'])
                        ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', ['Sales', 'Presales']));
                })
                ->orderBy('name')
                ->get(['id', 'name', 'email']) : [],
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
                'sales_pic' => $zoomSubAccount->salesPic?->only(['id', 'name', 'email']),
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
            if ($endpoint === 'account') {
                $details = (array) $cache->payload;
                $this->syncAccountTypeFromDetails($subAccount, $details);

                if (! $subAccount->last_seen_at || ! $cache->fetched_at || $cache->fetched_at->greaterThanOrEqualTo($subAccount->last_seen_at)) {
                    $this->syncAccountSummaryFromDetails($subAccount, $details);
                }
            }

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
            if ($endpoint === 'account') {
                $this->syncAccountSummaryFromDetails($subAccount, (array) $result['data']);
            }

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
            if ($endpoint === 'account') {
                $details = (array) $cache->payload;
                $this->syncAccountTypeFromDetails($subAccount, $details);

                if (! $subAccount->last_seen_at || ! $cache->fetched_at || $cache->fetched_at->greaterThanOrEqualTo($subAccount->last_seen_at)) {
                    $this->syncAccountSummaryFromDetails($subAccount, $details);
                }
            }

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

    /** Keep the list summary aligned with a newer Zoom account-detail snapshot. */
    private function syncAccountSummaryFromDetails(ZoomSubAccount $subAccount, array $details): void
    {
        $fields = [
            'account_name' => $details['account_name'] ?? null,
            'account_number' => isset($details['account_number']) ? (string) $details['account_number'] : null,
            'account_type' => $details['account_type'] ?? null,
            'owner_email' => $details['owner_email'] ?? null,
            'seats' => isset($details['seats']) ? (int) $details['seats'] : null,
            'zoom_created_at' => $details['created_at'] ?? null,
            'subscription_start_time' => $details['subscription_start_time'] ?? null,
            'subscription_end_time' => $details['subscription_end_time'] ?? null,
        ];

        $subAccount->fill(array_filter($fields, fn ($value) => $value !== null));
        if ($subAccount->isDirty()) {
            $subAccount->save();
        }
    }

    /** Zoom's detail endpoint is the canonical source when the list endpoint disagrees. */
    private function syncAccountTypeFromDetails(ZoomSubAccount $subAccount, array $details): void
    {
        if (isset($details['account_type']) && $subAccount->account_type !== $details['account_type']) {
            $subAccount->account_type = $details['account_type'];
            $subAccount->save();
        }
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

    public function exportExcel(Request $request)
    {
        ['rows' => $rows, 'report' => $report] = $this->zoomReportData($request);
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Zoom Sub Accounts');
        $sheet->mergeCells('A1:O1');
        $sheet->setCellValue('A1', 'LAPORAN ZOOM SUB ACCOUNT');
        $sheet->mergeCells('A2:O2');
        $sheet->setCellValue('A2', 'Dibuat '.$report['generated_at'].' · '.$report['filter_label']);
        $sheet->mergeCells('A3:O3');
        $sheet->setCellValue('A3', "Total akun: {$report['total']} · Total license: {$report['total_seats']} · Customer terkait: {$report['matched']} · Belum ditautkan: {$report['unmatched']}");

        $headers = ['No.', 'Nama Akun', 'ZAN (Zoom Account Number)', 'Zoom Account ID', 'Account Type', 'Seats (License)', 'Account Owner', 'Creation Time', 'Service Effective Date', 'Subscription End', 'Who Will Pay', 'Auto Renew', 'Customer QSales', 'Sales PIC Renewal', 'Status Sinkronisasi'];
        $sheet->fromArray($headers, null, 'A5');
        foreach ($rows as $index => $row) {
            $values = [$index + 1, ...array_values($row)];
            foreach ($values as $column => $value) {
                $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($column + 1).($index + 6));
                if ($column === 0 || $column === 5) {
                    $cell->setValue(is_numeric($value) ? (int) $value : $value);
                } else {
                    $cell->setValueExplicit((string) ($value ?? ''), DataType::TYPE_STRING);
                }
            }
        }

        $lastRow = max(5, count($rows) + 5);
        $sheet->getStyle('A1:O1')->getFont()->setBold(true)->setSize(16)->getColor()->setRGB('0F172A');
        $sheet->getStyle('A2:O3')->getFont()->getColor()->setRGB('475569');
        $sheet->getStyle('A5:O5')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A5:O5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0F766E');
        $sheet->getStyle("A5:O{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
        $sheet->getStyle("A5:O{$lastRow}")->getAlignment()->setWrapText(true);
        $sheet->setAutoFilter("A5:O{$lastRow}");
        $sheet->freezePane('A6');
        foreach (range('A', 'O') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        $sheet->getColumnDimension('B')->setWidth(32);
        $sheet->getColumnDimension('D')->setWidth(34);
        $sheet->getColumnDimension('G')->setWidth(30);
        $sheet->getColumnDimension('M')->setWidth(30);
        $sheet->getColumnDimension('N')->setWidth(25);

        $fileName = 'Laporan_Zoom_Sub_Account_'.now()->format('Ymd_His').'.xlsx';
        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $fileName, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    public function exportPdf(Request $request)
    {
        ['rows' => $rows, 'report' => $report] = $this->zoomReportData($request);

        return Pdf::loadView('exports.zoom-sub-accounts', compact('rows', 'report'))
            ->setPaper('a3', 'landscape')
            ->download('Laporan_Zoom_Sub_Account_'.now()->format('Ymd_His').'.pdf');
    }

    public function prepareExport(Request $request, ZoomService $zoomService): JsonResponse
    {
        $accounts = $this->filteredZoomAccounts($request);
        $accountIds = $accounts->pluck('zoom_account_id');

        if ($request->has('account_ids')) {
            $validated = $request->validate([
                'account_ids' => ['required', 'array', 'max:10'],
                'account_ids.*' => ['required', 'string', 'max:80'],
            ]);
            $allowedIds = $accountIds->intersect($validated['account_ids'])->values();
            $fetched = 0;
            $failed = 0;

            foreach ($allowedIds as $accountId) {
                $result = $zoomService->readSubAccount($accountId, 'account');
                if (! $result['available'] || ! is_array($result['data'])) {
                    $failed++;
                    continue;
                }

                $detailCache = ZoomSubAccountDetail::query()->updateOrCreate(
                    ['zoom_account_id' => $accountId, 'detail_type' => 'account'],
                    ['payload' => $result['data'], 'fetched_at' => now()]
                );
                $subAccount = ZoomSubAccount::where('zoom_account_id', $accountId)->first();
                if ($subAccount) {
                    $this->syncAccountSummaryFromDetails($subAccount, (array) $detailCache->payload);
                }
                $fetched++;
            }

            return response()->json(['fetched' => $fetched, 'failed' => $failed]);
        }

        $cachedDetails = ZoomSubAccountDetail::query()
            ->whereIn('zoom_account_id', $accountIds)
            ->where('detail_type', 'account')
            ->get()
            ->keyBy('zoom_account_id');

        $missingIds = $accounts->filter(function (ZoomSubAccount $account) use ($cachedDetails) {
            $payload = (array) ($cachedDetails->get($account->zoom_account_id)?->payload ?? []);
            $options = (array) data_get($payload, 'options', []);

            return ! array_key_exists('pay_mode', $options)
                || $options['pay_mode'] === null
                || $options['pay_mode'] === ''
                || ! array_key_exists('billing_auto_renew', $options)
                || $options['billing_auto_renew'] === null;
        })->pluck('zoom_account_id')->values();

        return response()->json(['missing_ids' => $missingIds, 'missing_count' => $missingIds->count()]);
    }

    private function zoomReportData(Request $request): array
    {
        $accounts = $this->filteredZoomAccounts($request);
        $detailCaches = ZoomSubAccountDetail::query()
            ->whereIn('zoom_account_id', $accounts->pluck('zoom_account_id'))
            ->where('detail_type', 'account')
            ->get()
            ->keyBy('zoom_account_id');

        $rows = $accounts->map(function (ZoomSubAccount $account) use ($detailCaches) {
            $detail = (array) ($detailCaches->get($account->zoom_account_id)?->payload ?? []);
            $payMode = data_get($detail, 'options.pay_mode');
            $autoRenew = data_get($detail, 'options.billing_auto_renew');

            return [
                $account->account_name ?: 'Tanpa nama',
                $account->account_number ?: '—',
                $account->zoom_account_id,
                $account->account_type ?: '—',
                $account->seats ?? 0,
                $account->owner_email ?: '—',
                $account->zoom_created_at?->format('d M Y, H:i') ?: '—',
                $account->subscription_start_time?->format('d M Y') ?: '—',
                $account->subscription_end_time?->format('d M Y') ?: '—',
                $payMode === 'master' ? 'Master account holder' : ($payMode === 'sub' ? 'Sub-account holder' : 'Tidak tersedia'),
                is_bool($autoRenew) ? ($autoRenew ? 'Ya' : 'Tidak') : 'Tidak tersedia',
                $account->customer?->name ?: 'Belum ditautkan',
                $account->salesPic?->name ? $account->salesPic->name.($account->salesPic->email ? ' ('.$account->salesPic->email.')' : '') : 'Belum ditentukan',
                $account->is_present ? 'Aktif' : 'Tidak terlihat di sinkronisasi terakhir',
            ];
        });

        $expiryLabel = match ($request->input('expiry', 'all')) {
            '0-30' => 'Renewal 1 bulan (0–30 hari)',
            '31-60' => 'Renewal 2 bulan (31–60 hari)',
            '61-90' => 'Renewal 3 bulan (61–90 hari)',
            'expired' => 'Masa langganan sudah lewat',
            default => 'Semua masa renewal',
        };
        $filterParts = [$expiryLabel];
        if ($request->filled('search')) {
            $filterParts[] = 'Pencarian: '.trim((string) $request->input('search'));
        }
        if ($request->input('match', 'all') !== 'all') {
            $filterParts[] = $request->input('match') === 'matched' ? 'Customer sudah ditautkan' : 'Customer belum ditautkan';
        }
        if ($request->input('presence', 'present') !== 'present') {
            $filterParts[] = $request->input('presence') === 'missing' ? 'Tidak terlihat di sinkronisasi terakhir' : 'Semua status sinkronisasi';
        }

        return [
            'rows' => $rows->values()->all(),
            'report' => [
                'generated_at' => now()->format('d M Y, H:i'),
                'filter_label' => implode(' · ', $filterParts),
                'total' => $accounts->count(),
                'total_seats' => (int) $accounts->sum('seats'),
                'matched' => $accounts->whereNotNull('customer_id')->count(),
                'unmatched' => $accounts->whereNull('customer_id')->count(),
            ],
        ];
    }

    private function filteredZoomAccounts(Request $request)
    {
        $query = ZoomSubAccount::query()->with(['customer:id,name', 'salesPic:id,name,email']);
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('account_name', 'like', "%{$search}%")
                    ->orWhere('account_number', 'like', "%{$search}%")
                    ->orWhere('zoom_account_id', 'like', "%{$search}%")
                    ->orWhere('owner_email', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->input('match', 'all') === 'matched') {
            $query->whereNotNull('customer_id');
        } elseif ($request->input('match', 'all') === 'unmatched') {
            $query->whereNull('customer_id');
        }
        if ($request->input('presence', 'present') === 'missing') {
            $query->where('is_present', false);
        } elseif ($request->input('presence', 'present') === 'present') {
            $query->where('is_present', true);
        }
        $this->applyExpiryFilter($query, (string) $request->input('expiry', 'all'), now()->startOfDay());

        return $query->orderByDesc('zoom_created_at')->orderBy('account_name')->get();
    }

    private function applyExpiryFilter($query, string $expiryFilter, $today): void
    {
        if ($expiryFilter === 'expired') {
            $query->whereDate('subscription_end_time', '<', $today->toDateString());
        } elseif (in_array($expiryFilter, ['0-30', '31-60', '61-90'], true)) {
            [$startDay, $endDay] = match ($expiryFilter) {
                '0-30' => [0, 30],
                '31-60' => [31, 60],
                default => [61, 90],
            };
            $query->whereDate('subscription_end_time', '>=', $today->copy()->addDays($startDay)->toDateString())
                ->whereDate('subscription_end_time', '<=', $today->copy()->addDays($endDay)->toDateString());
        }
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
            'sales_pic_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);
        $newCustomer = ! empty($data['customer_id']) ? Customer::find($data['customer_id']) : null;
        $salesPic = ! empty($data['sales_pic_id'])
            ? \App\Models\User::query()
                ->where('is_active', true)
                ->where(function ($query) {
                    $query->whereIn('role', ['Sales', 'Presales'])
                        ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', ['Sales', 'Presales']));
                })
                ->find($data['sales_pic_id'])
            : null;
        if (! empty($data['sales_pic_id']) && ! $salesPic) {
            return back()->withErrors(['sales_pic_id' => 'Pilih Sales atau Presales yang aktif.']);
        }

        DB::transaction(function () use ($request, $zoomSubAccount, $data, $newCustomer, $salesPic) {
            $zoomSubAccount = ZoomSubAccount::query()->lockForUpdate()->findOrFail($zoomSubAccount->id);
            $oldCustomerName = $zoomSubAccount->customer?->name;
            $oldSalesPicName = $zoomSubAccount->salesPic?->name;
            $zoomSubAccount->update([
                'customer_id' => $data['customer_id'] ?? null,
                'sales_pic_id' => $data['sales_pic_id'] ?? null,
                'matched_by' => $newCustomer ? $request->user()->id : null,
                'matched_at' => $newCustomer ? now() : null,
            ]);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => $newCustomer ? 'ZOOM_SUB_ACCOUNT_CUSTOMER_MATCHED' : 'ZOOM_SUB_ACCOUNT_CUSTOMER_UNLINKED',
                'entity_type' => 'ZOOM_SUB_ACCOUNT',
                'entity_id' => $zoomSubAccount->zoom_account_id,
                'description' => $newCustomer
                    ? "Zoom sub-account {$zoomSubAccount->account_name} dikaitkan dengan customer {$newCustomer->name}; Sales PIC renewal: ".($salesPic?->name ?? 'belum ditentukan')."."
                    : "Kaitan customer {$oldCustomerName} dihapus dari Zoom sub-account {$zoomSubAccount->account_name}; Sales PIC sebelumnya: ".($oldSalesPicName ?? 'belum ditentukan').".",
            ]);
        });

        return back()->with('message', $newCustomer
            ? "Sub-account dikaitkan dengan customer {$newCustomer->name}".($salesPic ? " dan Sales PIC renewal {$salesPic->name}." : '. Sales PIC belum ditentukan; reminder renewal tidak akan dikirim.')
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
