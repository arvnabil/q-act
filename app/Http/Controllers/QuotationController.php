<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\CompanyBankAccount;
use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SystemSetting;
use App\Services\NotificationService;
use Illuminate\Http\Request;
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
    private function serializeFull(Quotation $q): array
    {
        return [
            'id' => $q->id,
            'status' => $q->status,
            'date' => $q->date?->toDateString(),
            'expired' => $q->expired?->toDateString(),
            'created_at' => $q->created_at,
            'updated_at' => $q->updated_at,
            'grand_total' => $q->grand_total,
            'subtotal' => $q->subtotal,
            'tax_amount' => $q->tax_amount,
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
            'items' => $q->items->map(fn ($i) => [
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
        $quotation->load(['customer.pics', 'pic', 'sales', 'creator', 'items.product.brand', 'bankAccount']);

        $bankAccounts = CompanyBankAccount::orderByDesc('is_default')->get()->map(fn ($b) => [
            'id' => $b->id,
            'bank_name' => $b->bank_name,
            'account_number' => $b->account_number,
            'account_name' => $b->account_name,
            'branch' => $b->branch ?? null,
            'is_default' => $b->is_default ?? false,
        ]);

        $user = $request->user();

        return Inertia::render('QuotationDetail', [
            'quotation' => $this->serializeFull($quotation),
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
        $quotation->load(['customer.pics', 'pic', 'sales', 'creator', 'items.product.brand', 'bankAccount']);

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
            'status' => 'sometimes|in:created,sent,approved,rejected,expired',
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
            'items' => 'nullable|array',
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

        // Update top-level quotation fields
        $quotationFields = collect($data)->except('items')->toArray();
        $quotation->fill($quotationFields);
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

        // Recalculate grand_total if not provided
        if (! isset($data['grand_total'])) {
            $quotation->load('items');
            $subtotal = $quotation->items->sum(fn ($i) => ($i->qty ?? 0) * ($i->price ?? 0));
            $tax = ($quotation->calc_tax && $quotation->show_tax) ? $subtotal * ($quotation->ppn_rate ?? 0.11) : 0;
            $quotation->subtotal = $subtotal;
            $quotation->tax_amount = $tax;
            $quotation->grand_total = $subtotal + $tax;
            $quotation->save();
        }

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

        $message = ($quotation->status === 'approved' && $previousStatus !== 'approved')
            ? "Quotation {$quotation->id} disetujui! Sales Order (SO) berhasil digenerate otomatis."
            : 'Quotation berhasil diperbarui.';

        return back()->with('message', $message);
    }

    /**
     * Auto-generate a Sales Order from approved Quotation.
     */
    private function autoGenerateSalesOrder(Quotation $quotation): void
    {
        $soId = 'SO.'.$quotation->id;
        if (SalesOrder::where('id', $soId)->orWhere('quotation_id', $quotation->id)->exists()) {
            return;
        }

        $quotation->load(['items.product']);

        $subtotal = $quotation->items->sum(fn ($i) => ($i->qty ?? 0) * ($i->price ?? 0));
        $tax = ($quotation->calc_tax && $quotation->show_tax) ? $subtotal * ($quotation->ppn_rate ?? 0.11) : 0;
        $grandTotal = $quotation->grand_total ?: ($subtotal + $tax);

        $so = SalesOrder::create([
            'id' => $soId,
            'quotation_id' => $quotation->id,
            'date' => now()->toDateString(),
            'customer_id' => $quotation->customer_id,
            'sales_id' => $quotation->sales_id ?: $quotation->created_by,
            'bu_id' => $quotation->bu_id,
            'status' => 'Dibuat Sales',
            'total_item_value' => $grandTotal,
            'total_cost' => 0,
            'grand_total' => $grandTotal,
        ]);

        $sortIndex = 0;
        foreach ($quotation->items as $i) {
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

    // ─── DESTROY ──────────────────────────────────────────────────────────────
    public function destroy(Quotation $quotation)
    {
        $id = $quotation->id;
        $quotation->update(['is_deleted' => true, 'deleted_at' => now()]);

        NotificationService::notifyUser(
            auth()->id(),
            'Quotation Dihapus',
            "Anda menghapus quotation: {$id}",
            '/quotations'
        );

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

        $last = Quotation::where('id', 'LIKE', "{$prefix}%")
            ->orderByRaw('CAST(SUBSTRING_INDEX(id, ".", -1) AS UNSIGNED) DESC')
            ->first();

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
