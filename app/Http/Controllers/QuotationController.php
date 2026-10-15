<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\ActivityLog;
use App\Models\CompanyBankAccount;
use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\QuotationSalesNote;
use App\Models\QuotationPurchaseOrder;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserTermsTemplate;
use App\Services\NotificationService;
use App\Services\QuotationCalculator;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class QuotationController extends Controller
{
    // ─── Helper: serialize a Quotation for list view ──────────────────────────
    private function serializeForList(Quotation $q): array
    {
        return [
            'id' => $q->id,
            'status' => $q->status,
            'po_status' => $q->po_status,
            'po_number' => $q->po_number,
            'po_date' => $q->po_date?->toDateString(),
            'po_document_path' => $q->po_document_path,
            'date' => $q->date?->toDateString(),
            'expired' => $q->expired?->toDateString(),
            'created_at' => $q->created_at,
            'grand_total' => $q->grand_total,
            'customer' => $q->customer ? ['id' => $q->customer->id, 'name' => $q->customer->name] : null,
            'pic' => $q->pic ? ['id' => $q->pic->id, 'name' => $q->pic->name] : null,
            'creator' => $q->creator ? ['id' => $q->creator->id, 'name' => $q->creator->name] : null,
            'sales' => $q->sales ? ['id' => $q->sales->id, 'name' => $q->sales->name] : null,
            'items' => $q->items->map(fn ($i) => [
                'id' => $i->id,
                'qty' => $i->qty,
                'price' => $i->price,
                'brand' => $i->brand,
                'product' => $i->product ? [
                    'id' => $i->product->id,
                    'name' => $i->product->name,
                    'brand' => $i->product->brand ? ['name' => $i->product->brand->name] : null,
                ] : null,
            ])->toArray(),
        ];
    }

    // ─── Helper: serialize full Quotation for edit/detail/show ───────────────
    private function serializeFull(Quotation $q, bool $forPrint = false): array
    {
        $rootQuotationId = ($q->relation_type ?? 'main') === 'split' && $q->parent_quotation_id
            ? $q->parent_quotation_id
            : $q->id;
        $rootQuotation = Quotation::query()
            ->select(['id', 'status', 'relation_type', 'parent_quotation_id', 'revision_no', 'grand_total'])
            ->with(['revisions:id,parent_quotation_id,status,relation_type,revision_no,grand_total,po_status,po_number,po_date,po_document_path', 'revisions.items:id,quotation_id,source_quotation_item_id,qty,price'])
            ->find($rootQuotationId);

        $quotationStructure = [
            'root' => $rootQuotation ? [
                'id' => $rootQuotation->id,
                'status' => $rootQuotation->status,
            ] : null,
            'current_id' => $q->id,
            'children' => $rootQuotation?->revisions
                ->where('relation_type', 'split')
                ->map(fn ($child) => [
                    'id' => $child->id,
                    'status' => $child->status,
                    'revision_no' => (int) ($child->revision_no ?? 0),
                    'grand_total' => $child->grand_total,
                ])->values()->toArray() ?? [],
        ];

        $splitChildren = $q->revisions->where('relation_type', 'split');
        $allocatedSplitItemIds = QuotationItem::whereIn('quotation_id', $splitChildren->pluck('id'))
            ->whereNotNull('source_quotation_item_id')
            ->pluck('source_quotation_item_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->toArray();

        $itemsForOutput = $q->items;
        if ($forPrint && ($q->relation_type ?? 'main') !== 'split' && $allocatedSplitItemIds) {
            $itemsForOutput = $itemsForOutput->reject(fn ($item) => in_array((int) $item->id, $allocatedSplitItemIds, true))->values();
        }
        $printTotals = $forPrint
            ? app(QuotationCalculator::class)->calculateTotals($q, $itemsForOutput)
            : null;
        $remainingRootItemIds = $q->items
            ->reject(fn ($item) => in_array((int) $item->id, $allocatedSplitItemIds, true))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();

        return [
            'id' => $q->id,
            'status' => $q->status,
            'po_status' => $q->po_status,
            'po_number' => $q->po_number,
            'po_date' => $q->po_date?->toDateString(),
            'po_document_path' => $q->po_document_path,
            'date' => $q->date?->toDateString(),
            'expired' => $q->expired?->toDateString(),
            'created_at' => $q->created_at,
            'updated_at' => $q->updated_at,
            'parent_quotation_id' => $q->parent_quotation_id,
            'source_sales_order_id' => $q->source_sales_order_id,
            'revision_no' => (int) ($q->revision_no ?? 0),
            'relation_type' => $q->relation_type ?? 'main',
            'quotation_structure' => $quotationStructure,
            'po_units' => ($q->relation_type ?? 'main') !== 'split'
                ? collect([[
                    'id' => $q->id,
                    'label' => 'Quotation Utama',
                    'relation_type' => 'main',
                    'status' => $q->status,
                    'po_status' => $q->po_status,
                    'po_number' => $q->po_number,
                    'po_date' => $q->po_date?->toDateString(),
                    'po_document_path' => $q->po_document_path,
                    'items_count' => $remainingRootItemIds->count(),
                    'grand_total' => app(QuotationCalculator::class)->calculateTotals($q, $q->items->whereIn('id', $remainingRootItemIds))['grand_total'],
                ]])->merge($splitChildren->map(fn ($child) => [
                    'id' => $child->id,
                    'label' => 'Sub Quotation',
                    'relation_type' => 'split',
                    'status' => $child->status,
                    'po_status' => $child->po_status,
                    'po_number' => $child->po_number,
                    'po_date' => $child->po_date?->toDateString(),
                    'po_document_path' => $child->po_document_path,
                    'items_count' => $child->items->count(),
                    'grand_total' => $child->grand_total,
                ]))->values()->toArray()
                : [],
            'allocated_split_item_ids' => $allocatedSplitItemIds,
            'parent_quotation' => $q->parentQuotation ? ['id' => $q->parentQuotation->id, 'status' => $q->parentQuotation->status] : null,
            'revisions' => $q->revisions->map(fn ($r) => [
                'id' => $r->id,
                'status' => $r->status,
                'revision_no' => $r->revision_no,
                'relation_type' => $r->relation_type ?? 'revision',
                'grand_total' => $r->grand_total,
                'po_status' => $r->po_status,
                'po_number' => $r->po_number,
                'po_date' => $r->po_date?->toDateString(),
                'po_document_path' => $r->po_document_path,
            ])->values()->toArray(),
            'sales_orders' => $q->salesOrders->map(fn ($so) => ['id' => $so->id, 'status' => $so->status])->values()->toArray(),
            'purchase_orders' => $q->purchaseOrders->map(fn ($po) => [
                'id' => $po->id,
                'status' => $po->status,
                'po_number' => $po->po_number,
                'po_date' => $po->po_date?->toDateString(),
                'document_path' => $po->document_path,
                'quotation_item_ids' => $po->quotation_item_ids ?? [],
            ])->values()->toArray(),
            'change_requests' => $q->changeRequests->map(fn ($cr) => [
                'id' => $cr->id, 'type' => $cr->type, 'status' => $cr->status,
                'reason' => $cr->reason, 'manager_comment' => $cr->manager_comment,
                'created_at' => $cr->created_at,
                'requester' => $cr->requester ? ['id' => $cr->requester->id, 'name' => $cr->requester->name] : null,
                'approver' => $cr->approver ? ['id' => $cr->approver->id, 'name' => $cr->approver->name] : null,
                'resulting_quotation_id' => $cr->resulting_quotation_id,
            ])->values()->toArray(),
            'timeline' => ActivityLog::where(function ($query) use ($q) {
                $query->where(function ($quotationQuery) use ($q) {
                    $quotationQuery->where('entity_type', 'QUOTATION')->where('entity_id', $q->id);
                })->orWhere(function ($salesOrderQuery) use ($q) {
                    $salesOrderQuery->where('entity_type', 'SALES_ORDER')->whereIn('entity_id', $q->salesOrders->pluck('id'));
                });
            })
                ->with('user:id,name')
                ->latest()->get()->map(fn ($log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'created_at' => $log->created_at,
                    'user' => $log->user ? ['name' => $log->user->name] : null,
                ])->values()->toArray(),
            'grand_total' => $printTotals['grand_total'] ?? $q->grand_total,
            'subtotal' => $printTotals['subtotal'] ?? $q->subtotal,
            'tax_amount' => $printTotals['ppn_amount'] ?? $q->tax_amount,
            'calc_tax' => $q->calc_tax ?? true,
            'show_tax' => $q->show_tax ?? true,
            'ppn_rate' => $q->ppn_rate ?? 0.11,
            'calc_pph' => $q->calc_pph ?? false,
            'show_pph' => $q->show_pph ?? false,
            'pph_rate' => $q->pph_rate ?? 0.02,
            'notes' => $q->notes,
            'terms' => is_array($q->terms) ? $q->terms : [],
            'customer_id' => $q->customer_id,
            'pic_id' => $q->pic_id,
            'sales_id' => $q->sales_id,
            'bu_id' => $q->bu_id,
            'bank_account_id' => $q->bank_account_id,
            'customer' => $q->customer ? [
                'id' => $q->customer->id,
                'name' => $q->customer->name,
                'address' => $q->customer->address,
                'pics' => $q->customer->pics->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'phone' => $p->phone,
                    'email' => $p->email,
                    'is_primary' => (bool) $p->is_primary,
                ])->toArray(),
            ] : null,
            'pic' => $q->pic ? [
                'id' => $q->pic->id,
                'name' => $q->pic->name,
                'phone' => $q->pic->phone,
                'email' => $q->pic->email,
            ] : null,
            'creator' => $q->creator ? [
                'id' => $q->creator->id,
                'name' => $q->creator->name,
                'email' => $q->creator->email,
                'mobile' => $q->creator->mobile ?? null,
            ] : ($q->sales ? [
                'id' => $q->sales->id,
                'name' => $q->sales->name,
                'email' => $q->sales->email,
                'mobile' => $q->sales->mobile ?? null,
            ] : null),
            'sales' => $q->sales ? [
                'id' => $q->sales->id,
                'name' => $q->sales->name,
            ] : null,
            'bank_account' => $q->bankAccount ? [
                'id' => $q->bankAccount->id,
                'bank_name' => $q->bankAccount->bank_name,
                'account_number' => $q->bankAccount->account_number,
                'account_name' => $q->bankAccount->account_name,
                'branch' => $q->bankAccount->branch ?? null,
                'is_default' => $q->bankAccount->is_default ?? false,
            ] : null,
            'items' => $itemsForOutput->map(fn ($i) => [
                'id' => $i->id,
                'sort_order' => $i->sort_order,
                'qty' => $i->qty,
                'hpp' => $i->hpp ?: ($i->product?->modal ?: 0),
                'margin' => $i->margin ?? ($i->price > 0 && ($i->hpp ?: $i->product?->modal) ? round((($i->price - ($i->hpp ?: $i->product?->modal)) / $i->price) * 100) : 0),
                'price' => $i->price,
                'brand' => $i->brand ?? $i->product?->brand?->name,
                'name' => $i->name ?? $i->product?->name,
                'sku' => $i->sku ?? $i->product?->sku,
                'description' => $i->description ?? $i->product?->description,
                'image_url' => $i->image_url ?? $i->product?->image_url,
                'is_pph_applied' => (bool) ($i->is_pph_applied ?? false),
                'product_id' => $i->product_id ?? $i->product?->id,
                'product' => $i->product ? [
                    'id' => $i->product->id ?? $i->product->sku,
                    'name' => $i->product->name,
                    'sku' => $i->product->sku,
                    'description' => $i->product->description,
                    'image_url' => $i->product->image_url,
                    'price' => $i->product->price,
                    'modal' => $i->product->modal,
                    'hpp' => $i->product->modal,
                    'pricelist_distributor' => $i->product->pricelist_distributor,
                    'diskon_distributor' => $i->product->diskon_distributor,
                    'brand' => $i->product->brand ? ['id' => $i->product->brand->id, 'name' => $i->product->brand->name] : null,
                ] : null,
            ])->toArray(),
        ];
    }

    // ─── INDEX ────────────────────────────────────────────────────────────────
    public function index(Request $request): Response
    {
        $user = $request->user()->load('businessUnit');
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);
        $isFinance = $user->role === 'Finance';

        $query = Quotation::with(['customer', 'pic', 'sales', 'creator', 'items.product.brand'])
            ->whereNull('deleted_at')
            ->where('is_deleted', false);
        // Split quotations are accessed from their parent quotation detail.
        // Keep the main quotation list focused on the parent documents.
        $query->where(function ($q) {
            $q->whereNull('relation_type')->orWhere('relation_type', '!=', 'split');
        });

        if (! $isManagerOrAdmin && ! $isFinance) {
            $userBuId = $user->businessUnit?->id;
            $query->where(function ($q) use ($user, $userBuId) {
                $q->where('created_by', $user->id)->orWhere('sales_id', $user->id);
                if ($userBuId) {
                    $q->orWhere('bu_id', $userBuId);
                }
            });
        }

        $quotations = $query->orderByDesc('created_at')->get()->map(fn ($q) => $this->serializeForList($q));

        return Inertia::render('Quotations', [
            'quotations' => $quotations,
            'isFinance' => $isFinance,
        ]);
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────
    public function create(Request $request): Response
    {
        $user = $request->user()->load('businessUnit');
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);

        $customerQuery = Customer::with('pics');
        if (! $isManagerOrAdmin) {
            $customerQuery->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhereHas('pics', fn ($p) => $p->where('sales_id', $user->id))
                    ->orWhereHas('quotations', fn ($qt) => $qt->where('sales_id', $user->id)->orWhere('created_by', $user->id)
                    );
            });
        }

        $customers = $customerQuery->orderBy('name')->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'address' => $c->address,
            'pics' => $c->pics->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'email' => $p->email,
                'is_primary' => (bool) $p->is_primary,
            ])->toArray(),
        ]);

        $bankAccounts = CompanyBankAccount::orderByDesc('is_default')->get()->map(fn ($b) => [
            'id' => $b->id,
            'bank_name' => $b->bank_name,
            'account_number' => $b->account_number,
            'account_name' => $b->account_name,
            'branch' => $b->branch ?? null,
            'is_default' => $b->is_default ?? false,
        ]);

        return Inertia::render('QuotationCreate', [
            'customers' => $customers,
            'bankAccounts' => $bankAccounts,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'sales_code' => $user->sales_code ?? null,
                'bu' => $user->businessUnit ? [
                    'id' => $user->businessUnit->id,
                    'name' => $user->businessUnit->name,
                    'code' => $user->businessUnit->code,
                ] : null,
            ],
        ]);
    }

    // ─── STORE ────────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required_without:new_customer_name|nullable|string|exists:customers,id',
            'pic_id' => 'nullable|string',
            'expiry_days' => 'nullable|integer|min:1|max:365',
            'prefix_type' => 'nullable|in:bu,personal',
            'notes' => 'nullable|string',
            // new customer fields
            'new_customer_name' => 'required_without:customer_id|nullable|string|max:255',
            'new_customer_address' => 'nullable|string',
            'new_pics' => 'nullable|array',
        ]);

        $user = $request->user()->load('businessUnit');

        $customerId = $request->input('customer_id');
        $picId = $request->input('pic_id');

        // Handle creation of new customer if new_customer_name is provided
        if (! $customerId && $request->filled('new_customer_name')) {
            $customer = Customer::create([
                'id' => $this->generateCustomerId(),
                'name' => trim($request->input('new_customer_name')),
                'address' => $request->input('new_customer_address') ?: null,
                'created_by' => $user->id,
            ]);
            $customerId = $customer->id;

            $newPics = $request->input('new_pics', []);
            if (! empty($newPics)) {
                foreach ($newPics as $idx => $p) {
                    if (empty(trim($p['name'] ?? ''))) {
                        continue;
                    }
                    $createdPic = CustomerPic::create([
                        'customer_id' => $customer->id,
                        'name' => trim($p['name']),
                        'email' => $p['email'] ?? null,
                        'phone' => $p['phone'] ?? null,
                        'is_primary' => $idx === 0,
                    ]);
                    if ($idx === 0) {
                        $picId = $createdPic->id;
                    }
                }
            }
        }

        $buCode = $user->businessUnit?->code;
        $buId = $user->businessUnit?->id;
        $salesCode = $user->sales_code ?? strtoupper(substr($user->name ?? 'SLS', 0, 3));
        $expiryDays = $request->input('expiry_days', 30);
        $prefixType = $request->input('prefix_type', 'bu');
        $prefixCode = ($prefixType === 'bu' && $buCode) ? $buCode : $salesCode;

        $id = $this->generateQuotationId($prefixCode);

        $quotation = Quotation::create([
            'id' => $id,
            'customer_id' => $customerId,
            'pic_id' => $picId ?: null,
            'notes' => $request->notes,
            'status' => 'created',
            'created_by' => $user->id,
            'sales_id' => $user->id,
            'bu_id' => $buId ?? null,
            'date' => now()->toDateString(),
            'expired' => now()->addDays($expiryDays)->toDateString(),
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'QUOTATION_CREATED',
            'entity_type' => 'QUOTATION',
            'entity_id' => $quotation->id,
            'description' => "Quotation {$quotation->id} dibuat.",
        ]);

        NotificationService::notifyUser(
            $user->id,
            'Quotation Baru',
            "Anda membuat quotation baru: {$quotation->id}",
            "/quotations/{$quotation->id}"
        );

        return redirect()->route('quotations.edit', $quotation->id)
            ->with('message', "Quotation {$quotation->id} berhasil dibuat.");
    }

    // ─── SHOW ─────────────────────────────────────────────────────────────────
    public function show(Quotation $quotation, Request $request): Response
    {
        if ($quotation->is_deleted || $quotation->deleted_at) {
            if (($quotation->relation_type ?? 'main') === 'split' && $quotation->parent_quotation_id) {
                return redirect()->route('quotations.show', $quotation->parent_quotation_id)
                    ->with('message', "Sub quotation {$quotation->id} sudah berada di Sampah.");
            }

            return redirect()->route('quotations.index')
                ->with('message', 'Quotation tersebut sudah berada di Sampah.');
        }

        $quotation->load(['customer.pics', 'pic', 'sales', 'creator', 'items.product.brand', 'bankAccount', 'parentQuotation', 'revisions', 'salesOrders', 'purchaseOrders', 'changeRequests.requester', 'changeRequests.approver']);

        $rootQuotationId = ($quotation->relation_type ?? 'main') === 'split' && $quotation->parent_quotation_id
            ? $quotation->parent_quotation_id
            : $quotation->id;
        $printQuotations = Quotation::query()
            ->where(function ($query) use ($rootQuotationId) {
                $query->where('id', $rootQuotationId)
                    ->orWhere('parent_quotation_id', $rootQuotationId);
            })
            ->where('is_deleted', false)
            ->with(['customer.pics', 'pic', 'sales', 'creator', 'items.product.brand', 'bankAccount', 'parentQuotation', 'revisions', 'salesOrders', 'purchaseOrders', 'changeRequests.requester', 'changeRequests.approver'])
            ->get()
            ->sortBy(fn ($item) => $item->id === $rootQuotationId ? 0 : 1)
            ->values()
            ->map(fn ($item) => $this->serializeFull($item, true));

        $bankAccounts = CompanyBankAccount::orderByDesc('is_default')->get()->map(fn ($b) => [
            'id' => $b->id,
            'bank_name' => $b->bank_name,
            'account_number' => $b->account_number,
            'account_name' => $b->account_name,
            'branch' => $b->branch ?? null,
            'is_default' => $b->is_default ?? false,
        ]);

        $user = $request->user();
        $companyInfo = SystemSetting::find('company_info')?->value;
        $domainLogoMap = SystemSetting::find('domain_logo_map')?->value ?? [];

        return Inertia::render('QuotationDetail', [
            'quotation' => $this->serializeFull($quotation),
            'printDocuments' => $printQuotations,
            'companyInfo' => $companyInfo,
            'domainLogoMap' => $domainLogoMap,
            'bankAccounts' => $bankAccounts,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'spatie_role' => $user->roles->first()?->name ?? $user->role,
            ],
        ]);
    }

    // ─── EDIT ─────────────────────────────────────────────────────────────────
    public function edit(Quotation $quotation, Request $request): Response
    {
        $quotation->load(['customer.pics', 'pic', 'sales', 'creator', 'items.product.brand', 'bankAccount', 'parentQuotation', 'revisions', 'salesOrders', 'changeRequests.requester', 'changeRequests.approver']);

        $user = $request->user();
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);

        $customerQuery = Customer::with('pics');
        if (! $isManagerOrAdmin) {
            $customerQuery->where(function ($q) use ($user, $quotation) {
                $q->where('created_by', $user->id)
                    ->orWhereHas('pics', fn ($p) => $p->where('sales_id', $user->id))
                    ->orWhereHas('quotations', fn ($qt) => $qt->where('sales_id', $user->id)->orWhere('created_by', $user->id)
                    )
                    ->orWhere('id', $quotation->customer_id);
            });
        }

        $customers = $customerQuery->orderBy('name')->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'address' => $c->address,
            'pics' => $c->pics->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'email' => $p->email,
                'is_primary' => (bool) $p->is_primary,
            ])->toArray(),
        ]);

        $products = Product::with('brand')->get()->map(fn ($p) => [
            'id' => $p->id ?? $p->sku,
            'name' => $p->name,
            'sku' => $p->sku,
            'description' => $p->description,
            'image_url' => $p->image_url,
            'price' => $p->price,
            'modal' => $p->modal,
            'hpp' => $p->modal,
            'pricelist_distributor' => $p->pricelist_distributor,
            'diskon_distributor' => $p->diskon_distributor,
            'brand' => $p->brand ? ['id' => $p->brand->id, 'name' => $p->brand->name] : null,
        ]);

        $brands = Brand::orderBy('name')->get()->map(fn ($b) => [
            'id' => $b->id,
            'name' => $b->name,
        ]);

        $bankAccounts = CompanyBankAccount::orderByDesc('is_default')->get()->map(fn ($b) => [
            'id' => $b->id,
            'bank_name' => $b->bank_name,
            'account_number' => $b->account_number,
            'account_name' => $b->account_name,
            'branch' => $b->branch ?? null,
            'is_default' => $b->is_default ?? false,
        ]);

        $user = $request->user()->load('businessUnit');

        $masterTermsSetting = SystemSetting::find('master_terms_templates') ?? SystemSetting::find('master_terms');
        $masterTerms = $masterTermsSetting?->value ?? [
            [
                'id' => 'master_std_ppn11',
                'name' => 'Standard Project (PPN 11%)',
                'type' => 'master',
                'terms' => [
                    'Harga belum termasuk PPN 11%',
                    'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
                    'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
                    'Garansi resmi distributor berlaku sesuai ketentuan produk',
                ],
            ],
            [
                'id' => 'master_inc_ppn11',
                'name' => 'Harga Termasuk PPN (Inc. PPN 11%)',
                'type' => 'master',
                'terms' => [
                    'Harga sudah termasuk PPN 11%',
                    'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
                    'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
                    'Garansi resmi distributor berlaku sesuai ketentuan produk',
                ],
            ],
        ];

        return Inertia::render('QuotationEdit', [
            'quotation' => $this->serializeFull($quotation),
            'customers' => $customers,
            'products' => $products,
            'brands' => $brands,
            'bankAccounts' => $bankAccounts,
            'masterTerms' => $masterTerms,
            'personalTerms' => UserTermsTemplate::where('user_id', $user->id)->get()->map(fn ($template) => [
                'id' => $template->id,
                'name' => $template->name,
                'type' => 'personal',
                'terms' => $template->terms,
            ])->values()->toArray(),
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'sales_code' => $user->sales_code ?? null,
                'bu' => $user->businessUnit ? [
                    'id' => $user->businessUnit->id,
                    'name' => $user->businessUnit->name,
                    'code' => $user->businessUnit->code,
                ] : null,
            ],
        ]);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────
    public function update(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'customer_id' => 'sometimes|string|exists:customers,id',
            'pic_id' => 'nullable|string',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:created,revision_draft,sent,approved,rejected,expired,cancelled,superseded',
            'po_status' => 'nullable|string|max:50',
            'po_number' => 'nullable|string|max:100',
            'po_date' => 'nullable|date',
            'po_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'grand_total' => 'nullable|numeric',
            'subtotal' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'calc_tax' => 'sometimes|boolean',
            'show_tax' => 'sometimes|boolean',
            'ppn_rate' => 'sometimes|numeric',
            'calc_pph' => 'sometimes|boolean',
            'show_pph' => 'sometimes|boolean',
            'pph_rate' => 'sometimes|numeric',
            'bank_account_id' => 'nullable|string',
            'terms' => 'nullable|array',
            'expired' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable',
            'items.*.product_id' => 'nullable',
            'items.*.name' => 'nullable|string',
            'items.*.sku' => 'nullable|string',
            'items.*.brand' => 'nullable|string',
            'items.*.qty' => 'required_with:items|numeric|min:0',
            'items.*.hpp' => 'nullable|numeric',
            'items.*.price' => 'required_with:items|numeric|min:0',
            'items.*.margin' => 'nullable|numeric',
            'items.*.description' => 'nullable|string',
            'items.*.image_url' => 'nullable|string',
            'items.*.sort_order' => 'nullable|integer',
            'items.*.is_pph_applied' => 'nullable|boolean',
        ]);

        $previousStatus = $quotation->status;

        // An approved quotation is the immutable source document for its SO.
        // Changes must go through the manager-approved revision workflow.
        if ($previousStatus === 'approved') {
            return back()->withErrors([
                'quotation' => 'Quotation yang sudah menjadi PO/SO terkunci. Ajukan revisi melalui halaman detail quotation.',
            ]);
        }

        if (($data['status'] ?? null) === 'approved' && $previousStatus !== 'approved') {
            $poErrors = [];
            if (blank($data['po_status'] ?? null)) {
                $poErrors['po_status'] = 'Status PO wajib diisi.';
            }
            if (blank($data['po_number'] ?? null)) {
                $poErrors['po_number'] = 'Nomor PO wajib diisi.';
            }
            if (blank($data['po_date'] ?? null)) {
                $poErrors['po_date'] = 'Tanggal PO wajib diisi.';
            }
            if (! $request->hasFile('po_document') && ! $quotation->po_document_path) {
                $poErrors['po_document'] = 'Dokumen PO wajib diunggah.';
            }
            if ($poErrors) {
                return back()->withErrors($poErrors);
            }
        }

        // Update top-level quotation fields
        $quotationFields = collect($data)->except('items')->toArray();
        $quotation->fill($quotationFields);
        if ($request->hasFile('po_document')) {
            $quotation->po_document_path = $request->file('po_document')->store('po-documents', 'public');
        }
        $quotation->updated_by = $request->user()->id;
        $quotation->save();

        // Handle items upsert if provided
        if ($request->has('items') && is_array($data['items'] ?? null)) {
            $incomingIds = [];

            foreach ($data['items'] as $idx => $itemData) {
                $itemId = $itemData['id'] ?? null;
                $sku = $itemData['sku'] ?? null;

                $itemImageUrl = $this->processImageUrl($itemData['image_url'] ?? null, $sku ?? 'item');

                // Ensure SKU exists in products table to avoid foreign key constraint violations
                if ($sku) {
                    $sku = trim($sku);
                    $existingProduct = Product::where('sku', $sku)->first();
                    if (! $existingProduct) {
                        $brandId = null;
                        if (! empty($itemData['brand'])) {
                            $brand = Brand::firstOrCreate(
                                ['name' => trim($itemData['brand'])],
                                ['color_hex' => '#6366f1']
                            );
                            $brandId = $brand->id;
                        }
                        Product::create([
                            'sku' => $sku,
                            'name' => $itemData['name'] ?? $sku,
                            'brand_id' => $brandId,
                            'description' => $itemData['description'] ?? null,
                            'price' => $itemData['price'] ?? 0,
                            'modal' => $itemData['hpp'] ?? 0,
                            'pricelist_distributor' => $itemData['pricelist_distributor'] ?? 0,
                            'diskon_distributor' => $itemData['diskon_distributor'] ?? 0,
                            'image_url' => $itemImageUrl,
                        ]);
                    }
                }

                $itemFields = [
                    'quotation_id' => $quotation->id,
                    'product_id' => $itemData['product_id'] ?? null,
                    'name' => $itemData['name'] ?? null,
                    'sku' => $sku,
                    'brand' => $itemData['brand'] ?? null,
                    'qty' => $itemData['qty'] ?? 1,
                    'hpp' => $itemData['hpp'] ?? 0,
                    'price' => $itemData['price'] ?? 0,
                    'margin' => $itemData['margin'] ?? 0,
                    'description' => $itemData['description'] ?? null,
                    'image_url' => $itemImageUrl,
                    'sort_order' => $itemData['sort_order'] ?? $idx,
                    'is_pph_applied' => $itemData['is_pph_applied'] ?? false,
                ];

                if ($itemId && QuotationItem::where('id', $itemId)->where('quotation_id', $quotation->id)->exists()) {
                    QuotationItem::where('id', $itemId)->update($itemFields);
                    $incomingIds[] = $itemId;
                } else {
                    $newItem = QuotationItem::create($itemFields);
                    $incomingIds[] = $newItem->id;
                }
            }

            // Remove items not in incoming list
            QuotationItem::where('quotation_id', $quotation->id)
                ->whereNotIn('id', $incomingIds)
                ->delete();
        }

        // Financial totals are authoritative on the server and always use 2 decimals.
        $quotation->load('items');
        $totals = app(QuotationCalculator::class)->calculateTotals($quotation, $quotation->items);
        $quotation->subtotal = $totals['subtotal'];
        $quotation->tax_amount = $totals['ppn_amount'];
        $quotation->grand_total = $totals['grand_total'];
        $quotation->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => $quotation->status !== $previousStatus ? 'QUOTATION_STATUS_CHANGED' : 'QUOTATION_UPDATED',
            'entity_type' => 'QUOTATION',
            'entity_id' => $quotation->id,
            'description' => $quotation->status !== $previousStatus
                ? "Status quotation berubah dari {$previousStatus} menjadi {$quotation->status}."
                : "Quotation {$quotation->id} diperbarui.",
        ]);

        // Auto-generate Sales Order if status changed to approved (PO)
        if ($quotation->status === 'approved' && $previousStatus !== 'approved') {
            $this->autoGenerateSalesOrder($quotation);
            NotificationService::notifyUser(
                $request->user()->id,
                'Quotation Disetujui',
                "Anda menyetujui Quotation {$quotation->id}. Sales Order (SO) otomatis dibuat.",
                "/quotations/{$quotation->id}"
            );
        } else {
            NotificationService::notifyUser(
                $request->user()->id,
                'Quotation Diperbarui',
                "Anda memperbarui quotation: {$quotation->id}",
                "/quotations/{$quotation->id}"
            );
        }

        if ($quotation->status === 'approved') {
            $this->ensurePrimaryPurchaseOrder($quotation, $request->user()->id);
            SalesOrder::where('quotation_id', $quotation->id)->update([
                'po_number' => $quotation->po_number,
                'po_date' => $quotation->po_date,
                'po_status' => $quotation->po_status,
                'po_document_path' => $quotation->po_document_path,
            ]);
        }

        $message = ($quotation->status === 'approved' && $previousStatus !== 'approved')
            ? "Quotation {$quotation->id} disetujui! Sales Order (SO) berhasil digenerate otomatis."
            : 'Quotation berhasil diperbarui.';

        return back()->with('message', $message);
    }

    /**
     * Auto-generate a Sales Order from approved Quotation.
     */
    private function autoGenerateSalesOrder(Quotation $quotation, ?Collection $sourceItems = null): void
    {
        $soId = 'SO.'.$quotation->id;
        if (SalesOrder::where('id', $soId)->orWhere('quotation_id', $quotation->id)->exists()) {
            return;
        }

        $quotation->load(['items.product']);
        $items = $sourceItems ?: $quotation->items;

        $totals = app(QuotationCalculator::class)->calculateTotals($quotation, $items);
        $subtotal = $totals['subtotal'];
        $grandTotal = $totals['grand_total'];

        $so = SalesOrder::create([
            'id' => $soId,
            'parent_sales_order_id' => $quotation->source_sales_order_id,
            'quotation_id' => $quotation->id,
            'date' => now()->toDateString(),
            'customer_id' => $quotation->customer_id,
            'sales_id' => $quotation->sales_id ?: $quotation->created_by,
            'bu_id' => $quotation->bu_id,
            'status' => 'Dibuat Sales',
            'po_number' => $quotation->po_number,
            'po_date' => $quotation->po_date,
            'po_status' => $quotation->po_status,
            'po_document_path' => $quotation->po_document_path,
            'total_item_value' => $grandTotal,
            'total_cost' => 0,
            'grand_total' => $grandTotal,
        ]);

        $sortIndex = 0;
        foreach ($items as $i) {
            SalesOrderItem::create([
                'so_id' => $so->id,
                'sku' => $i->sku ?: null,
                'item_name' => $i->name ?: ($i->product?->name ?: $i->sku),
                'qty' => $i->qty ?: 1,
                'price' => $i->price ?: 0,
                'hpp' => $i->hpp ?: 0,
                'sort_order' => $sortIndex++,
            ]);
        }

        ActivityLog::create([
            'user_id' => $quotation->updated_by ?: $quotation->created_by,
            'action' => 'SALES_ORDER_CREATED',
            'entity_type' => 'SALES_ORDER',
            'entity_id' => $so->id,
            'description' => "SO {$so->id} dibuat otomatis dari quotation {$quotation->id}.",
        ]);
    }

    private function ensurePrimaryPurchaseOrder(Quotation $quotation, string $userId): void
    {
        if ($quotation->purchaseOrders()->exists()) {
            return;
        }

        QuotationPurchaseOrder::create([
            'id' => (string) Str::uuid(),
            'quotation_id' => $quotation->id,
            'status' => $quotation->po_status ?: 'Diterima',
            'po_number' => $quotation->po_number,
            'po_date' => $quotation->po_date,
            'document_path' => $quotation->po_document_path,
            'quotation_item_ids' => $quotation->items()->pluck('id')->values()->all(),
            'created_by' => $userId,
        ]);
    }

    /**
     * Save PO metadata for the main quotation and all split quotations in one
     * form. Each unit owns its PO document and gets at most one SO.
     */
    public function bulkPurchaseOrder(Request $request, Quotation $quotation)
    {
        if (($quotation->relation_type ?? 'main') === 'split') {
            $quotation = Quotation::findOrFail($quotation->parent_quotation_id);
        }

        $data = $request->validate([
            'entries' => 'required|array|min:1',
            'entries.*.quotation_id' => 'required|string',
            'entries.*.status' => 'required|in:Diterima,Dibatalkan',
            'entries.*.po_number' => 'required|string|max:100',
            'entries.*.po_date' => 'required|date',
            'entries.*.po_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $quotation->load(['items.product', 'revisions.items.product', 'purchaseOrders']);
        $units = collect([$quotation])->merge($quotation->revisions->where('relation_type', 'split'));
        $entries = collect($data['entries']);
        $entryIds = $entries->pluck('quotation_id')->unique();

        if ($entryIds->count() !== $entries->count() || $entryIds->diff($units->pluck('id'))->isNotEmpty()) {
            return back()->withErrors(['entries' => 'Daftar quotation PO tidak valid. Muat ulang halaman lalu coba lagi.']);
        }

        $storedPaths = [];
        foreach ($entries as $index => $entry) {
            $target = $units->firstWhere('id', $entry['quotation_id']);
            $file = $request->file("entries.{$index}.po_document");
            if (! $file && ! $target->po_document_path) {
                return back()->withErrors(["entries.{$index}.po_document" => 'Dokumen PO wajib diunggah.']);
            }
            if ($file) {
                $storedPaths[$entry['quotation_id']] = $file->store('po-documents', 'public');
            }
        }

        DB::transaction(function () use ($entries, $units, $quotation, $storedPaths, $request) {
            foreach ($entries as $entry) {
                $target = $units->firstWhere('id', $entry['quotation_id']);
                $documentPath = $storedPaths[$target->id] ?? $target->po_document_path;
                $target->load('items.product');
                $items = $target->relation_type === 'split'
                    ? $target->items
                    : $this->remainingMainQuotationItems($quotation);
                $status = $entry['status'] === 'Diterima' ? 'approved' : 'cancelled';
                $previousStatus = $target->status;

                $target->update([
                    'status' => $status,
                    'po_status' => $entry['status'],
                    'po_number' => $entry['po_number'],
                    'po_date' => $entry['po_date'],
                    'po_document_path' => $documentPath,
                    'updated_by' => $request->user()->id,
                ]);

                $po = $target->purchaseOrders()->latest()->first();
                if ($po) {
                    $po->update([
                        'status' => $entry['status'],
                        'po_number' => $entry['po_number'],
                        'po_date' => $entry['po_date'],
                        'document_path' => $documentPath,
                        'quotation_item_ids' => $items->pluck('id')->values()->all(),
                    ]);
                } else {
                    QuotationPurchaseOrder::create([
                        'id' => (string) Str::uuid(),
                        'quotation_id' => $target->id,
                        'status' => $entry['status'],
                        'po_number' => $entry['po_number'],
                        'po_date' => $entry['po_date'],
                        'document_path' => $documentPath,
                        'quotation_item_ids' => $items->pluck('id')->values()->all(),
                        'created_by' => $request->user()->id,
                    ]);
                }

                if ($status === 'approved' && $items->isNotEmpty()) {
                    $this->autoGenerateSalesOrder($target, $items);
                }

                SalesOrder::where('quotation_id', $target->id)->update([
                    'po_number' => $entry['po_number'],
                    'po_date' => $entry['po_date'],
                    'po_status' => $entry['status'],
                    'po_document_path' => $documentPath,
                ]);

                ActivityLog::create([
                    'user_id' => $request->user()->id,
                    'action' => 'PURCHASE_ORDER_RECORDED',
                    'entity_type' => 'QUOTATION',
                    'entity_id' => $target->id,
                    'description' => "PO {$entry['po_number']} dicatat untuk quotation {$target->id} dengan status {$entry['status']}.",
                ]);
            }
        });

        return back()->with('message', 'Data PO utama dan sub quotation berhasil disimpan. SO dibuat hanya untuk unit yang memiliki item dan belum memiliki SO.');
    }

    private function remainingMainQuotationItems(Quotation $root): Collection
    {
        $allocatedIds = QuotationItem::whereIn(
            'quotation_id',
            $root->revisions->where('relation_type', 'split')->pluck('id')
        )->whereNotNull('source_quotation_item_id')->pluck('source_quotation_item_id');

        return $root->items->reject(fn ($item) => $allocatedIds->contains($item->id))->values();
    }

    // ─── REORDER ITEMS ─────────────────────────────────────────────────────────
    /**
     * Persist a new display order for a quotation's product items.
     *
     * Expects the full ordered list of existing quotation item ids. Persisted
     * atomically via a single UPDATE so partial reorders never occur.
     */
    public function reorderItems(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*' => 'required|integer',
        ]);

        $orderedIds = array_values(array_unique(array_map('intval', $data['items'])));

        $existingIds = QuotationItem::where('quotation_id', $quotation->id)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values()
            ->all();

        sort($orderedIds);

        if ($orderedIds !== $existingIds) {
            return response()->json([
                'message' => 'Urutan item tidak sesuai dengan item quotation saat ini. Muat ulang halaman dan coba lagi.',
            ], 422);
        }

        // Re-build ordered ids for the CASE statement (already validated ints,
        // so they are safe to inline).
        $orderedIds = array_values(array_unique(array_map('intval', $data['items'])));
        $cases = [];
        foreach ($orderedIds as $index => $id) {
            $cases[] = 'WHEN '.$id.' THEN '.($index + 1);
        }

        QuotationItem::where('quotation_id', $quotation->id)
            ->whereIn('id', $orderedIds)
            ->update([
                'sort_order' => DB::raw('CASE id '.implode(' ', $cases).' ELSE sort_order END'),
            ]);

        return response()->json(['success' => true]);
    }

    // ─── DUPLICATE ────────────────────────────────────────────────────────────
    /**
     * Create an independent copy of an existing quotation.
     *
     * A brand-new quotation record is created (new PK = new quotation number via
     * the shared generateQuotationId() generator) together with fresh child rows
     * for every quotation item and sales-zone note. Shared master data (customer,
     * PIC, sales, business unit, bank account, products) is re-referenced, never
     * copied. The workflow always starts over from "created".
     *
     * The whole copy runs inside a single transaction; any failure rolls back the
     * entire duplicate so no partial quotation can ever be left behind. The new id
     * is picked with the central generator, and in the unlikely case of a
     * concurrent collision on the primary key the operation retries a few times
     * before giving up.
     */
    public function duplicate(Request $request, Quotation $quotation)
    {
        $user = $request->user()->load('businessUnit');

        if (! $this->canCreateQuotation($user)) {
            return back()->with('error', 'Anda tidak memiliki izin untuk menduplikasi quotation.');
        }

        if ($quotation->is_deleted || $quotation->deleted_at) {
            return back()->with('error', 'Quotation tidak ditemukan.');
        }

        $quotation->load(['items', 'salesNotes']);

        // Resolve the numbering prefix exactly like a freshly created quotation
        // (QuotationController::store), so the duplicate continues the normal
        // sequential series for the acting user's BU/sales namespace.
        $buCode = $user->businessUnit?->code;
        $prefixCode = $buCode ?: ($user->sales_code ?? strtoupper(substr($user->name ?? 'SLS', 0, 3)));

        $attempts = 0;
        while (true) {
            try {
                $newQuotation = DB::transaction(function () use ($quotation, $user, $prefixCode) {
                    $newId = $this->generateQuotationId($prefixCode);

                    $newQuotation = Quotation::create([
                        'id' => $newId,
                        'customer_id' => $quotation->customer_id,
                        'pic_id' => $quotation->pic_id,
                        'sales_id' => $quotation->sales_id ?: $user->id,
                        'bu_id' => $quotation->bu_id,
                        'bank_account_id' => $quotation->bank_account_id,
                        'status' => 'created',
                        'date' => now()->toDateString(),
                        'expired' => $quotation->expired?->toDateString(),
                        'calc_tax' => $quotation->calc_tax,
                        'show_tax' => $quotation->show_tax,
                        'ppn_rate' => $quotation->ppn_rate,
                        'calc_pph' => $quotation->calc_pph,
                        'show_pph' => $quotation->show_pph,
                        'pph_rate' => $quotation->pph_rate,
                        'subtotal' => $quotation->subtotal,
                        'tax_amount' => $quotation->tax_amount,
                        'grand_total' => $quotation->grand_total,
                        'notes' => $quotation->notes,
                        'terms' => $quotation->terms,
                        'is_deleted' => false,
                        'deleted_at' => null,
                        'created_by' => $user->id,
                    ]);

                    foreach ($quotation->items as $item) {
                        QuotationItem::create([
                            'quotation_id' => $newQuotation->id,
                            'product_id' => $item->product_id,
                            'sku' => $item->sku,
                            'name' => $item->name,
                            'brand' => $item->brand,
                            'description' => $item->description,
                            'image_url' => $item->image_url,
                            'qty' => $item->qty,
                            'hpp' => $item->hpp,
                            'price' => $item->price,
                            'margin' => $item->margin,
                            'is_pph_applied' => $item->is_pph_applied,
                            'sort_order' => $item->sort_order,
                        ]);
                    }

                    foreach ($quotation->salesNotes as $note) {
                        QuotationSalesNote::create([
                            'quotation_id' => $newQuotation->id,
                            'adjustments' => $note->adjustments,
                        ]);
                    }

                    return $newQuotation;
                });

                NotificationService::notifyUser(
                    $user->id,
                    'Quotation Duplikat',
                    "Anda membuat duplikat quotation: {$newQuotation->id} (dari {$quotation->id}).",
                    "/quotations/{$newQuotation->id}"
                );

                return redirect()->route('quotations.edit', $newQuotation->id)
                    ->with('message', "Quotation berhasil diduplikasi. Quotation baru: {$newQuotation->id}");
            } catch (QueryException $e) {
                $attempts++;
                if ($attempts >= 3 || ! $this->isUniqueConstraintViolation($e)) {
                    report($e);

                    return back()->with('error', 'Gagal menduplikasi quotation. Silakan coba lagi.');
                }
            } catch (\Throwable $e) {
                report($e);

                return back()->with('error', 'Gagal menduplikasi quotation. Silakan coba lagi.');
            }
        }
    }

    /**
     * Create a draft child quotation containing only the selected item lines.
     * This is intentionally separate from duplicate(): a split quotation keeps
     * its parent relationship and is used later to attach a separate PO/SO.
     */
    public function createSubQuotation(Request $request, Quotation $quotation)
    {
        $user = $request->user()->load('businessUnit');

        if (! $this->canCreateQuotation($user)) {
            return back()->with('error', 'Anda tidak memiliki izin untuk membuat sub quotation.');
        }

        $data = $request->validate([
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'required|integer',
        ]);

        $quotation->load(['items', 'salesNotes']);
        $selectedIds = collect($data['item_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $allocatedIds = QuotationItem::whereIn('quotation_id', $quotation->revisions()->where('relation_type', 'split')->pluck('id'))
            ->whereNotNull('source_quotation_item_id')
            ->pluck('source_quotation_item_id')
            ->map(fn ($id) => (int) $id);
        $selectedIds = $selectedIds->diff($allocatedIds)->values();
        $selectedItems = $quotation->items->whereIn('id', $selectedIds->all())->values();

        if ($selectedItems->isEmpty()) {
            return back()->withErrors(['item_ids' => 'Pilih minimal satu item yang akan masuk ke sub quotation.']);
        }

        $newQuotation = DB::transaction(function () use ($quotation, $selectedItems, $user) {
            $splitNumber = ((int) $quotation->revisions()->where('relation_type', 'split')->max('revision_no')) + 1;
            $newId = $quotation->id.'-'.$splitNumber;
            while (Quotation::where('id', $newId)->exists()) {
                $splitNumber++;
                $newId = $quotation->id.'-'.$splitNumber;
            }

            $newQuotation = Quotation::create([
                'id' => $newId,
                'parent_quotation_id' => $quotation->id,
                'relation_type' => 'split',
                'revision_no' => $splitNumber,
                'customer_id' => $quotation->customer_id,
                'pic_id' => $quotation->pic_id,
                'sales_id' => $quotation->sales_id ?: $user->id,
                'bu_id' => $quotation->bu_id,
                'bank_account_id' => $quotation->bank_account_id,
                'status' => 'created',
                'date' => now()->toDateString(),
                'expired' => $quotation->expired?->toDateString(),
                'calc_tax' => $quotation->calc_tax,
                'show_tax' => $quotation->show_tax,
                'ppn_rate' => $quotation->ppn_rate,
                'calc_pph' => $quotation->calc_pph,
                'show_pph' => $quotation->show_pph,
                'pph_rate' => $quotation->pph_rate,
                'notes' => $quotation->notes,
                'terms' => $quotation->terms,
                'is_deleted' => false,
                'created_by' => $user->id,
            ]);

            foreach ($selectedItems as $item) {
                QuotationItem::create([
                    'quotation_id' => $newQuotation->id,
                    'source_quotation_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'brand' => $item->brand,
                    'description' => $item->description,
                    'image_url' => $item->image_url,
                    'qty' => $item->qty,
                    'hpp' => $item->hpp,
                    'price' => $item->price,
                    'margin' => $item->margin,
                    'is_pph_applied' => $item->is_pph_applied,
                    'sort_order' => $item->sort_order,
                ]);
            }

            $totals = app(QuotationCalculator::class)->calculateTotals($newQuotation, $newQuotation->items()->get());
            $newQuotation->update([
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['ppn_amount'],
                'grand_total' => $totals['grand_total'],
            ]);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'QUOTATION_CREATED',
                'entity_type' => 'QUOTATION',
                'entity_id' => $newQuotation->id,
                'description' => "Sub quotation {$newQuotation->id} dibuat dari {$quotation->id} dengan {$selectedItems->count()} item.",
            ]);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'QUOTATION_UPDATED',
                'entity_type' => 'QUOTATION',
                'entity_id' => $quotation->id,
                'description' => "Sub quotation {$newQuotation->id} dibuat dari {$quotation->id} dengan {$selectedItems->count()} item.",
            ]);

            return $newQuotation;
        });

        return redirect()->route('quotations.edit', $newQuotation->id)
            ->with('message', "Sub quotation {$newQuotation->id} berhasil dibuat sebagai draft.");
    }

    /** Move an allocated item between draft split quotations under the same main quotation. */
    public function moveItemToSubQuotation(Request $request, Quotation $quotation, QuotationItem $item)
    {
        $user = $request->user();
        if (! $this->canCreateQuotation($user)) {
            return back()->withErrors(['item' => 'Anda tidak memiliki izin memindahkan item.']);
        }

        $data = $request->validate([
            'target_quotation_id' => 'required|string',
        ]);

        $isMainQuotation = ($quotation->relation_type ?? 'main') !== 'split';
        if ($quotation->status === 'approved' || $quotation->is_deleted) {
            return back()->withErrors(['item' => 'Quotation yang sudah menjadi PO/SO tidak dapat diubah.']);
        }

        if ((string) $item->quotation_id !== (string) $quotation->id) {
            return back()->withErrors(['item' => 'Item tidak ditemukan pada sub quotation ini.']);
        }

        $rootQuotationId = $isMainQuotation ? $quotation->id : $quotation->parent_quotation_id;
        $returnToMain = $data['target_quotation_id'] === '__main__';

        if ($returnToMain) {
            if ($isMainQuotation || ! $item->source_quotation_item_id) {
                return back()->withErrors(['target_quotation_id' => 'Item ini tidak dapat dikembalikan ke quotation utama.']);
            }

            DB::transaction(function () use ($quotation, $item, $user) {
                $sourceItemId = $item->source_quotation_item_id;
                $item->delete();
                $quotation->load('items');
                $totals = app(QuotationCalculator::class)->calculateTotals($quotation, $quotation->items);
                $quotation->update([
                    'subtotal' => $totals['subtotal'],
                    'tax_amount' => $totals['ppn_amount'],
                    'grand_total' => $totals['grand_total'],
                    'updated_by' => $user->id,
                ]);

                ActivityLog::create([
                    'user_id' => $user->id,
                    'action' => 'QUOTATION_UPDATED',
                    'entity_type' => 'QUOTATION',
                    'entity_id' => $quotation->id,
                    'description' => "Item sumber {$sourceItemId} dikembalikan dari sub quotation {$quotation->id} ke quotation utama {$quotation->parent_quotation_id}.",
                ]);
            });

            return back()->with('message', 'Item berhasil dikembalikan ke quotation utama.');
        }

        $target = Quotation::query()
            ->where('id', $data['target_quotation_id'])
            ->where('parent_quotation_id', $rootQuotationId)
            ->where('relation_type', 'split')
            ->where('is_deleted', false)
            ->first();

        if (! $target || $target->id === $quotation->id || ! in_array($target->status, ['created', 'revision_draft'], true)) {
            return back()->withErrors(['target_quotation_id' => 'Sub quotation tujuan tidak valid atau sudah terkunci.']);
        }

        if ($isMainQuotation) {
            $alreadyAllocated = QuotationItem::whereIn('quotation_id', Quotation::where('parent_quotation_id', $rootQuotationId)->where('relation_type', 'split')->pluck('id'))
                ->where('source_quotation_item_id', $item->id)
                ->exists();

            if ($alreadyAllocated) {
                return back()->withErrors(['item' => 'Item ini sudah dialokasikan ke sub quotation lain.']);
            }
        }

        DB::transaction(function () use ($quotation, $target, $item, $user, $isMainQuotation) {
            $nextSortOrder = ((int) $target->items()->max('sort_order')) + 1;
            if ($isMainQuotation) {
                QuotationItem::create([
                    'quotation_id' => $target->id,
                    'source_quotation_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'brand' => $item->brand,
                    'description' => $item->description,
                    'image_url' => $item->image_url,
                    'qty' => $item->qty,
                    'hpp' => $item->hpp,
                    'price' => $item->price,
                    'margin' => $item->margin,
                    'is_pph_applied' => $item->is_pph_applied,
                    'sort_order' => $nextSortOrder,
                ]);
            } else {
                $item->update([
                    'quotation_id' => $target->id,
                    'sort_order' => $nextSortOrder,
                ]);
            }

            $affectedQuotations = $isMainQuotation ? [$target] : [$quotation, $target];
            foreach ($affectedQuotations as $affectedQuotation) {
                $affectedQuotation->load('items');
                $totals = app(QuotationCalculator::class)->calculateTotals($affectedQuotation, $affectedQuotation->items);
                $affectedQuotation->update([
                    'subtotal' => $totals['subtotal'],
                    'tax_amount' => $totals['ppn_amount'],
                    'grand_total' => $totals['grand_total'],
                    'updated_by' => $user->id,
                ]);
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'QUOTATION_UPDATED',
                'entity_type' => 'QUOTATION',
                'entity_id' => $quotation->id,
                'description' => "Item {$item->name} dipindahkan dari sub quotation {$quotation->id} ke {$target->id}.",
            ]);
        });

        return back()->with('message', "Item berhasil dipindahkan ke {$target->id}.");
    }

    /** Add the next customer PO without overwriting the first PO or SO. */
    public function addPurchaseOrder(Request $request, Quotation $quotation)
    {
        if ($quotation->status !== 'approved') {
            return back()->withErrors(['quotation' => 'PO tambahan hanya dapat ditambahkan setelah quotation disetujui.']);
        }

        $data = $request->validate([
            'status' => 'required|in:Diterima,Sebagian,Dibatalkan',
            'po_number' => 'required|string|max:100',
            'po_date' => 'required|date',
            'po_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'integer',
        ]);

        $quotation->load(['items', 'salesOrders.items']);
        $selectedIds = collect($data['item_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $usedIds = $quotation->purchaseOrders()->pluck('quotation_item_ids')->flatMap(fn ($ids) => is_array($ids) ? $ids : [])->map(fn ($id) => (int) $id);
        if ($selectedIds->intersect($usedIds)->isNotEmpty()) {
            return back()->withErrors(['item_ids' => 'Ada item yang sudah dialokasikan ke PO lain.']);
        }

        $items = $quotation->items->whereIn('id', $selectedIds->all())->values();
        if ($items->isEmpty()) {
            return back()->withErrors(['item_ids' => 'Pilih minimal satu item untuk PO ini.']);
        }

        $path = $request->file('po_document')->store('po-documents', 'public');
        $rootSo = $quotation->salesOrders->firstWhere('parent_sales_order_id', null) ?: $quotation->salesOrders->first();
        if (! $rootSo) {
            return back()->withErrors(['quotation' => 'SO utama belum ditemukan untuk quotation ini.']);
        }

        $childNumber = $quotation->purchaseOrders()->count() + 1;
        $childSoId = $rootSo->id.'-'.$childNumber;
        while (SalesOrder::where('id', $childSoId)->exists()) {
            $childNumber++;
            $childSoId = $rootSo->id.'-'.$childNumber;
        }

        DB::transaction(function () use ($data, $path, $quotation, $selectedIds, $items, $request, $rootSo, $childSoId) {
            QuotationPurchaseOrder::create([
                'id' => (string) Str::uuid(),
                'quotation_id' => $quotation->id,
                'status' => $data['status'],
                'po_number' => $data['po_number'],
                'po_date' => $data['po_date'],
                'document_path' => $path,
                'quotation_item_ids' => $selectedIds->all(),
                'created_by' => $request->user()->id,
            ]);

            $subtotal = $items->sum(fn ($item) => ($item->qty ?? 0) * ($item->price ?? 0));
            $subSo = SalesOrder::create([
                'id' => $childSoId,
                'parent_sales_order_id' => $rootSo->id,
                'quotation_id' => $quotation->id,
                'date' => now()->toDateString(),
                'customer_id' => $quotation->customer_id,
                'sales_id' => $quotation->sales_id ?: $quotation->created_by,
                'bu_id' => $quotation->bu_id,
                'status' => 'Dibuat Sales',
                'po_number' => $data['po_number'],
                'po_date' => $data['po_date'],
                'po_status' => $data['status'],
                'po_document_path' => $path,
                'total_item_value' => $subtotal,
                'total_cost' => 0,
                'grand_total' => $subtotal,
            ]);

            foreach ($items as $index => $item) {
                SalesOrderItem::create([
                    'so_id' => $subSo->id,
                    'sku' => $item->sku,
                    'item_name' => $item->name ?: $item->sku,
                    'qty' => $item->qty,
                    'price' => $item->price,
                    'hpp' => $item->hpp,
                    'sort_order' => $index,
                ]);
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'PURCHASE_ORDER_ADDED',
                'entity_type' => 'QUOTATION',
                'entity_id' => $quotation->id,
                'description' => "PO {$data['po_number']} ditambahkan dan sub-SO {$subSo->id} dibuat.",
            ]);
        });

        return back()->with('message', 'PO tambahan dan sub-SO berhasil dibuat.');
    }

    /** Import historical quotation/PO/SO data prepared in the 3-sheet template. */
    public function importLegacy(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'quotations' => 'required|array|min:1',
            'quotations.*.legacy_quotation_no' => 'required|string|max:30',
            'quotations.*.quotation_date' => 'required|date',
            'quotations.*.customer_name' => 'required|string|max:255',
            'quotations.*.sales_email' => 'nullable|email',
            'quotations.*.quotation_status' => 'required|in:created,sent,approved,cancelled,expired,rejected',
            'items' => 'nullable|array',
            'items.*.legacy_quotation_no' => 'required|string|max:30',
            'items.*.sku' => 'required|string|max:50',
            'items.*.qty' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'purchase_orders' => 'nullable|array',
            'purchase_orders.*.legacy_quotation_no' => 'required|string|max:30',
            'purchase_orders.*.po_number' => 'required|string|max:100',
            'purchase_orders.*.po_date' => 'required|date',
            'purchase_orders.*.po_status' => 'required|in:Diterima,Sebagian,Dibatalkan',
            'purchase_orders.*.so_number' => 'nullable|string|max:30',
            'purchase_orders.*.so_date' => 'nullable|date',
            'purchase_orders.*.item_no' => 'nullable|integer|min:1',
        ]);

        $itemsByQuotation = collect($data['items'] ?? [])->groupBy('legacy_quotation_no');
        $poByQuotation = collect($data['purchase_orders'] ?? [])->groupBy('legacy_quotation_no');

        try {
            DB::transaction(function () use ($data, $itemsByQuotation, $poByQuotation, $user) {
            foreach ($data['quotations'] as $row) {
                $legacyId = trim($row['legacy_quotation_no']);
                if (Quotation::where('id', $legacyId)->exists()) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'import' => "Quotation {$legacyId} sudah ada di sistem.",
                    ]);
                }

                $customer = Customer::whereRaw('LOWER(name) = ?', [strtolower(trim($row['customer_name']))])->first();
                $sales = ! empty($row['sales_email']) ? User::where('email', $row['sales_email'])->first() : null;
                if (! $customer) {
                    $customer = Customer::create([
                        'id' => $this->generateLegacyCustomerId(),
                        'name' => trim($row['customer_name']),
                        'address' => null,
                        'created_by' => $user->id,
                    ]);

                    ActivityLog::create([
                        'user_id' => $user->id,
                        'action' => 'CUSTOMER_CREATED_FROM_LEGACY_IMPORT',
                        'entity_type' => 'CUSTOMER',
                        'entity_id' => $customer->id,
                        'description' => "Customer {$customer->name} dibuat otomatis saat import quotation lama.",
                    ]);
                }
                $quotation = Quotation::create([
                    'id' => $legacyId,
                    'customer_id' => $customer->id,
                    'sales_id' => $sales?->id ?: $user->id,
                    'bu_id' => $sales?->bu_id,
                    'status' => $row['quotation_status'],
                    'date' => $row['quotation_date'],
                    'expired' => $row['expired'] ?? $row['quotation_date'],
                    'notes' => $row['notes'] ?? null,
                    'calc_tax' => true,
                    'show_tax' => true,
                    'ppn_rate' => 0.11,
                    'created_by' => $sales?->id ?: $user->id,
                    'updated_by' => $user->id,
                ]);

                foreach ($itemsByQuotation->get($legacyId, collect()) as $index => $itemRow) {
                    $product = Product::where('sku', trim($itemRow['sku']))->first();
                    if (! $product) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'import' => "SKU tidak ditemukan: {$itemRow['sku']}.",
                        ]);
                    }
                    QuotationItem::create([
                        'quotation_id' => $quotation->id,
                        'sku' => $product->sku,
                        'product_id' => $product->sku,
                        'name' => $itemRow['product_name'] ?? $product->name,
                        'brand' => $itemRow['brand'] ?? $product->brand?->name,
                        'description' => $itemRow['description'] ?? $product->description,
                        'qty' => $itemRow['qty'],
                        'hpp' => $itemRow['hpp'] ?? $product->modal ?? 0,
                        'price' => $itemRow['unit_price'],
                        'margin' => $itemRow['margin'] ?? 0,
                        'sort_order' => $index + 1,
                    ]);
                }

                $quotation->load('items');
                $totals = app(QuotationCalculator::class)->calculateTotals($quotation, $quotation->items);
                $quotation->update(['subtotal' => $totals['subtotal'], 'tax_amount' => $totals['ppn_amount'], 'grand_total' => $totals['grand_total']]);

                $firstHistoricalPo = $poByQuotation->get($legacyId, collect())->first();
                if ($firstHistoricalPo) {
                    $quotation->update([
                        'po_status' => $firstHistoricalPo['po_status'],
                        'po_number' => $firstHistoricalPo['po_number'],
                        'po_date' => $firstHistoricalPo['po_date'],
                    ]);
                }

                foreach ($poByQuotation->get($legacyId, collect())->groupBy('po_number') as $poRows) {
                    $firstPo = $poRows->first();
                    $itemIds = $poRows->pluck('item_no')->filter()->map(fn ($no) => $quotation->items->values()->get($no - 1)?->id)->filter()->values()->all();
                    QuotationPurchaseOrder::create([
                        'id' => (string) Str::uuid(),
                        'quotation_id' => $quotation->id,
                        'status' => $firstPo['po_status'],
                        'po_number' => $firstPo['po_number'],
                        'po_date' => $firstPo['po_date'],
                        'quotation_item_ids' => $itemIds ?: $quotation->items->pluck('id')->values()->all(),
                        'created_by' => $user->id,
                    ]);

                    $soNumber = $firstPo['so_number'] ?? null;
                    if ($soNumber && ! SalesOrder::where('id', $soNumber)->exists()) {
                        $so = SalesOrder::create([
                            'id' => $soNumber,
                            'quotation_id' => $quotation->id,
                            'customer_id' => $customer->id,
                            'sales_id' => $quotation->sales_id,
                            'bu_id' => $quotation->bu_id,
                            'date' => $firstPo['so_date'] ?? $firstPo['po_date'],
                            'po_number' => $firstPo['po_number'],
                            'po_date' => $firstPo['po_date'],
                            'po_status' => $firstPo['po_status'],
                            'status' => 'Historical',
                            'grand_total' => $quotation->grand_total,
                            'total_item_value' => $quotation->grand_total,
                        ]);
                        foreach ($quotation->items as $index => $item) {
                            SalesOrderItem::create(['so_id' => $so->id, 'sku' => $item->sku, 'item_name' => $item->name, 'qty' => $item->qty, 'price' => $item->price, 'hpp' => $item->hpp, 'sort_order' => $index]);
                        }
                    }
                }

                ActivityLog::create(['user_id' => $user->id, 'action' => 'LEGACY_IMPORT', 'entity_type' => 'QUOTATION', 'entity_id' => $quotation->id, 'description' => "Quotation {$quotation->id} diimpor dari data historis."]);
            }
            });
        } catch (\Illuminate\Validation\ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            report($exception);
            return back()->withErrors([
                'import' => 'Import gagal diproses: '.($exception->getMessage() ?: 'terjadi kesalahan server.'),
            ]);
        }

        return back()->with('message', count($data['quotations']).' quotation historis berhasil diimpor.');
    }

    /**
     * Roles that may create quotations may also duplicate them. Mirrors the
     * DEFAULT_ROLE_PERMISSIONS used by the role manager (quotations_create).
     */
    private function canCreateQuotation(User $user): bool
    {
        return in_array($user->role, ['Administrator', 'Manager', 'Sales Manager', 'Sales', 'Presales', 'admin'], true);
    }

    private function generateLegacyCustomerId(): string
    {
        do {
            $id = 'C'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (Customer::where('id', $id)->exists());

        return $id;
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        $code = (string) $e->getCode();
        $message = $e->getMessage();

        return in_array($code, ['23000', '23505'], true)
            || str_contains($message, 'Duplicate entry')
            || str_contains($message, 'UNIQUE constraint failed');
    }

    // ─── DESTROY ──────────────────────────────────────────────────────────────
    public function destroy(Quotation $quotation)
    {
        $id = $quotation->id;
        $redirectQuotationId = ($quotation->relation_type ?? 'main') === 'split'
            ? $quotation->parent_quotation_id
            : null;

        $quotation->update(['is_deleted' => true, 'deleted_at' => now()]);

        NotificationService::notifyUser(
            auth()->id(),
            'Quotation Dihapus',
            "Anda menghapus quotation: {$id}",
            $redirectQuotationId ? "/quotations/{$redirectQuotationId}" : '/quotations'
        );

        if ($redirectQuotationId) {
            return redirect()->route('quotations.show', $redirectQuotationId)->with('message', "Sub quotation {$id} berhasil dipindahkan ke Sampah.");
        }

        return redirect()->route('quotations.index')->with('message', 'Quotation berhasil dipindahkan ke Sampah.');
    }

    // ─── BULK DESTROY ─────────────────────────────────────────────────────────
    public function bulkDestroy(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'string']);
        $count = Quotation::whereIn('id', $request->ids)->update(['is_deleted' => true, 'deleted_at' => now()]);

        NotificationService::notifyUser(
            $request->user()->id,
            'Hapus Masal Quotation',
            "Anda menghapus {$count} quotation",
            '/quotations'
        );

        return back()->with('message', "{$count} quotation berhasil dipindahkan ke Sampah.");
    }

    // ─── ID GENERATOR ─────────────────────────────────────────────────────────
    private function generateQuotationId(string $prefixCode): string
    {
        $code = strtoupper($prefixCode);
        $date = now()->format('my'); // MMYY
        $prefix = "{$code}.{$date}.";

        $last = null;

        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            $last = Quotation::where('id', 'LIKE', "{$prefix}%")
                ->orderByRaw('CAST(SUBSTRING_INDEX(id, ".", -1) AS UNSIGNED) DESC')
                ->first();
        } else {
            // Portable fallback for drivers without SUBSTRING_INDEX/REVERSE
            // (e.g. the SQLite test database): resolve the max sequence number
            // in PHP instead of in SQL.
            $last = Quotation::where('id', 'LIKE', "{$prefix}%")
                ->get(['id'])
                ->sortByDesc(fn ($q) => (int) substr($q->id, strrpos($q->id, '.') + 1))
                ->first();
        }

        $num = $last ? (int) substr($last->id, strrpos($last->id, '.') + 1) + 1 : 1;

        return $prefix.str_pad($num, 3, '0', STR_PAD_LEFT);
    }

    private function processImageUrl(?string $imageUrl, string $prefix = 'product'): ?string
    {
        if (! $imageUrl) {
            return null;
        }

        if (! str_starts_with($imageUrl, 'data:image/')) {
            return $imageUrl;
        }

        try {
            preg_match('/^data:image\/(\w+);base64,/', $imageUrl, $type);
            $data = substr($imageUrl, strpos($imageUrl, ',') + 1);
            $data = base64_decode($data);

            if ($data === false) {
                return null;
            }

            $ext = strtolower($type[1] ?? 'png');
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }

            $filename = time().'_'.Str::slug($prefix).'_'.Str::random(6).'.'.$ext;
            $path = 'images/products/'.$filename;

            Storage::disk('public')->put($path, $data);

            return Storage::url($path);
        } catch (\Throwable $e) {
            return $imageUrl;
        }
    }

    private function generateCustomerId(): string
    {
        $last = Customer::orderByRaw('CAST(SUBSTRING(id, 2) AS UNSIGNED) DESC')->first();
        $num = $last ? (int) substr($last->id, 1) + 1 : 1;

        return 'C'.str_pad($num, 6, '0', STR_PAD_LEFT);
    }
}
