<?php

namespace App\Http\Controllers;

use App\Models\CostCategory;
use App\Models\ActivityLog;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\SalesOrderCost;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);
        $isFinance = $user->role === 'Finance';

        $query = SalesOrder::with(['customer', 'quotation.purchaseOrders', 'sales', 'creator']);

        if (! $isManagerOrAdmin && ! $isFinance) {
            $query->where('sales_id', $user->id);
        }

        $salesOrders = $query->orderByDesc('created_at')->get()->map(function ($so) {
            $latestPo = $so->quotation?->purchaseOrders?->sortByDesc('created_at')->first();

            $poNumber = $so->po_number
                ?: $latestPo?->po_number
                ?: $so->quotation?->po_number;

            $poDate = $so->po_date?->toDateString()
                ?: $latestPo?->po_date?->toDateString()
                ?: $so->quotation?->po_date?->toDateString();

            $poStatus = $so->po_status
                ?: $latestPo?->status
                ?: $so->quotation?->po_status
                ?: ($so->quotation?->status === 'approved' ? 'Diterima' : null);

            $poDocument = $so->po_document_path
                ?: $latestPo?->document_path
                ?: $so->quotation?->po_document_path;

            $normalizedStatus = strtolower(trim($poStatus ?? ''));
            $isPoReceived = in_array($normalizedStatus, ['diterima', 'sebagian'])
                || strtolower(trim($so->quotation?->status ?? '')) === 'approved';
            $hasPo = $isPoReceived || !empty($poStatus) || !empty($poNumber) || !empty($poDate) || !empty($poDocument);
            $missingPoDate = $hasPo && empty($poDate);
            $isPoComplete = !empty($poNumber) && !empty($poDate);

            return [
                'id' => $so->id,
                'quotation_id' => $so->quotation_id,
                'status' => $so->status,
                'date' => $so->date?->toDateString(),
                'grand_total' => (float) $so->grand_total,
                'created_at' => $so->created_at,
                'po_number' => $poNumber,
                'po_date' => $poDate,
                'po_status' => $poStatus ?: ($hasPo ? 'Diterima' : null),
                'po_document_path' => $poDocument,
                'is_po_received' => $isPoReceived,
                'has_po' => $hasPo,
                'is_po_complete' => $isPoComplete,
                'missing_po_date' => $missingPoDate,
                'customer' => $so->customer ? ['id' => $so->customer->id, 'name' => $so->customer->name] : null,
                'sales' => $so->sales ? ['id' => $so->sales->id, 'name' => $so->sales->name] : null,
            ];
        });

        $salesUsers = ($isManagerOrAdmin || $isFinance)
            ? User::whereIn('role', ['Sales', 'Presales', 'Sales Manager', 'Manager'])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->values()
            : [];

        return Inertia::render('SalesOrders', [
            'salesOrders' => $salesOrders,
            'salesUsers' => $salesUsers,
            'isFinance' => $isFinance,
            'canFilterSales' => $isManagerOrAdmin || $isFinance,
        ]);
    }

    public function show(SalesOrder $salesOrder, Request $request): Response
    {
        $salesOrder->load(['customer', 'sales', 'creator', 'items.product', 'costs', 'quotation.items.product', 'quotation.parentQuotation', 'quotation.revisions', 'quotation.changeRequests.requester', 'quotation.changeRequests.approver']);

        $user = $request->user();
        // Finance action must only be available to the Finance role.
        $isFinance = $user->role === 'Finance';

        $costCategories = CostCategory::orderBy('sort_order')->orderBy('name')->get();

        $totalItemValue = (float) ($salesOrder->total_item_value ?: $salesOrder->items->sum(fn ($i) => ($i->qty * $i->price)));
        $totalCogs = (float) $salesOrder->items->sum(fn ($i) => ($i->qty * $i->hpp));
        $totalCost = (float) $salesOrder->costs->sum('amount');
        $grandTotal = (float) ($salesOrder->grand_total ?: $totalItemValue);

        return Inertia::render('SalesOrderDetail', [
            'so' => [
                'id' => $salesOrder->id,
                'quotation_id' => $salesOrder->quotation_id,
                'status' => $salesOrder->status,
                'po_status' => $salesOrder->po_status,
                'po_number' => $salesOrder->po_number,
                'po_date' => $salesOrder->po_date?->toDateString(),
                'po_document_path' => $salesOrder->po_document_path,
                'date' => $salesOrder->date?->toDateString(),
                'notes' => $salesOrder->notes,
                'total_item_value' => $totalItemValue,
                'total_cogs' => $totalCogs,
                'total_cost' => $totalCost,
                'grand_total' => $grandTotal,
                'customer' => $salesOrder->customer ? [
                    'id' => $salesOrder->customer->id,
                    'name' => $salesOrder->customer->name,
                    'address' => $salesOrder->customer->address,
                ] : null,
                'sales' => $salesOrder->sales ? [
                    'id' => $salesOrder->sales->id,
                    'name' => $salesOrder->sales->name,
                ] : null,
                'quotation' => $salesOrder->quotation ? [
                    'id' => $salesOrder->quotation->id,
                    'status' => $salesOrder->quotation->status,
                    'parent_quotation_id' => $salesOrder->quotation->parent_quotation_id,
                    'parent_quotation' => $salesOrder->quotation->parentQuotation ? ['id' => $salesOrder->quotation->parentQuotation->id] : null,
                    'revisions' => $salesOrder->quotation->revisions->map(fn ($revision) => ['id' => $revision->id, 'status' => $revision->status])->values()->toArray(),
                    'change_requests' => $salesOrder->quotation->changeRequests->map(fn ($changeRequest) => [
                        'id' => $changeRequest->id,
                        'type' => $changeRequest->type,
                        'status' => $changeRequest->status,
                        'reason' => $changeRequest->reason,
                        'manager_comment' => $changeRequest->manager_comment,
                        'requester' => $changeRequest->requester ? ['name' => $changeRequest->requester->name] : null,
                        'approver' => $changeRequest->approver ? ['name' => $changeRequest->approver->name] : null,
                        'created_at' => $changeRequest->created_at,
                        'resulting_quotation_id' => $changeRequest->resulting_quotation_id,
                    ])->values()->toArray(),
                    'timeline' => ActivityLog::where(function ($query) use ($salesOrder) {
                        $query->where(function ($q) use ($salesOrder) {
                            $q->where('entity_type', 'QUOTATION')->where('entity_id', $salesOrder->quotation_id);
                        })->orWhere(function ($q) use ($salesOrder) {
                            $q->where('entity_type', 'SALES_ORDER')->where('entity_id', $salesOrder->id);
                        });
                    })->with('user:id,name')->latest()->get()->map(fn ($log) => [
                        'id' => $log->id,
                        'action' => $log->action,
                        'description' => $log->description,
                        'created_at' => $log->created_at,
                        'user' => $log->user ? ['name' => $log->user->name] : null,
                    ])->values()->toArray(),
                    'calc_tax' => (bool) $salesOrder->quotation->calc_tax,
                    'calc_pph' => (bool) $salesOrder->quotation->calc_pph,
                    'pph_rate' => (float) ($salesOrder->quotation->pph_rate ?? 0.02),
                    'notes' => $salesOrder->quotation->notes,
                    'customer' => $salesOrder->customer,
                    'sales' => $salesOrder->sales,
                    'items' => $salesOrder->quotation->items,
                ] : null,
                'items' => $salesOrder->items->map(fn ($i) => [
                    'id' => $i->id,
                    'sort_order' => (int) ($i->sort_order ?? 0),
                    'sku' => $i->sku ?: '-',
                    'item_name' => $i->item_name ?: $i->product?->name ?: $i->sku ?: '-',
                    'name' => $i->item_name ?: $i->product?->name ?: $i->sku ?: '-',
                    'qty' => (float) $i->qty,
                    'price' => (float) $i->price,
                    'hpp' => (float) $i->hpp,
                ])->toArray(),
                'costs' => $salesOrder->costs->map(fn ($c) => [
                    'id' => $c->id,
                    'cost_category_id' => $c->cost_category_id,
                    'category_name' => $c->category_name ?: 'Others / Shipping/ Import',
                    'description' => $c->description,
                    'amount' => (float) $c->amount,
                ])->toArray(),
            ],
            'costCategories' => $costCategories,
            'isFinance' => $isFinance,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_id' => 'required|string|exists:quotations,id',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $quotation = Quotation::with('items.product')->find($validated['quotation_id']);

        $so = SalesOrder::create([
            'quotation_id' => $validated['quotation_id'],
            'customer_id' => $quotation->customer_id,
            'sales_id' => $quotation->sales_id,
            'created_by' => $user->id,
            'status' => 'Dibuat Sales',
            'grand_total' => $quotation->grand_total,
            'date' => now()->toDateString(),
            'notes' => $validated['notes'] ?? null,
        ]);

        $sortIndex = 0;
        foreach ($quotation->items as $qItem) {
            $so->items()->create([
                'sku' => $qItem->sku,
                'item_name' => $qItem->name ?: $qItem->product?->name ?: $qItem->sku,
                'qty' => $qItem->qty,
                'price' => $qItem->price,
                'hpp' => $qItem->hpp ?? $qItem->product?->modal ?? 0,
                'sort_order' => $sortIndex++,
            ]);
        }

        NotificationService::notifyUser(
            $user->id,
            'Sales Order Baru',
            "Anda membuat Sales Order baru: {$so->id}",
            "/sales-orders/{$so->id}"
        );

        return back()->with('message', 'Sales Order berhasil dibuat.');
    }

    public function update(Request $request, SalesOrder $salesOrder)
    {
        $validated = $request->validate([
            'status' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $salesOrder->update($validated);

        NotificationService::notifyUser(
            $request->user()->id,
            'Sales Order Diperbarui',
            "Anda memperbarui Sales Order: {$salesOrder->id}",
            "/sales-orders/{$salesOrder->id}"
        );

        return back()->with('message', 'Sales Order berhasil diperbarui.');
    }

    public function updatePurchaseOrderMetadata(Request $request, SalesOrder $salesOrder)
    {
        $data = $request->validate([
            'po_number' => 'required|string|max:100',
            'po_date' => 'required|date',
            'po_status' => 'required|in:Diterima,Sebagian,Dibatalkan',
            'po_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('po_document')) {
            $data['po_document_path'] = $request->file('po_document')->store('po-documents', 'public');
        }
        unset($data['po_document']);
        $salesOrder->update($data);

        if ($salesOrder->quotation) {
            $quotationData = [
                'po_number' => $salesOrder->po_number,
                'po_date' => $salesOrder->po_date,
                'po_status' => $salesOrder->po_status,
            ];
            if ($salesOrder->po_document_path) {
                $quotationData['po_document_path'] = $salesOrder->po_document_path;
            }
            $salesOrder->quotation->update($quotationData);
        }

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'PURCHASE_ORDER_METADATA_UPDATED',
            'entity_type' => 'SALES_ORDER',
            'entity_id' => $salesOrder->id,
            'description' => "Data PO historis untuk SO {$salesOrder->id} dilengkapi.",
        ]);

        return back()->with('message', 'Data PO berhasil dilengkapi.');
    }

    public function destroy(SalesOrder $salesOrder, Request $request)
    {
        $user = $request->user();
        $canDelete = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']) || $user->hasPermissionTo('sales_orders_delete');

        if (! $canDelete) {
            return back()->with('error', 'Anda tidak memiliki izin untuk menghapus Sales Order.');
        }

        $soId = $salesOrder->id;
        $salesOrder->delete();

        NotificationService::notifyUser(
            $user->id,
            'Sales Order Dihapus',
            "Anda menghapus Sales Order: {$soId}",
            '/sales-orders'
        );

        return back()->with('message', 'Sales Order berhasil dihapus.');
    }

    public function bulkDestroy(Request $request)
    {
        $user = $request->user();
        $canBulkDelete = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']) || $user->hasPermissionTo('sales_orders_delete_bulk') || $user->hasPermissionTo('sales_orders_delete');

        if (! $canBulkDelete) {
            return back()->with('error', 'Anda tidak memiliki izin untuk menghapus Sales Order secara massal.');
        }

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|string|exists:sales_orders,id',
        ]);

        $count = SalesOrder::whereIn('id', $validated['ids'])->delete();

        NotificationService::notifyUser(
            $user->id,
            'Hapus Masal Sales Order',
            "Anda menghapus {$count} Sales Order",
            '/sales-orders'
        );

        return back()->with('message', "{$count} Sales Order berhasil dihapus.");
    }

    public function storeCost(Request $request, SalesOrder $salesOrder)
    {
        $validated = $request->validate([
            'cost_category_id' => 'nullable|exists:cost_categories,id',
            'category_name' => 'nullable|string|max:100',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
        ]);

        $salesOrder->costs()->create($validated);

        $salesOrder->load(['items', 'costs']);
        $totalItemVal = $salesOrder->items->sum(fn ($i) => ($i->qty * $i->price));
        $totalCost = $salesOrder->costs->sum('amount');
        $salesOrder->update([
            'total_item_value' => $totalItemVal,
            'total_cost' => $totalCost,
            'grand_total' => $totalItemVal,
        ]);

        return back()->with('message', 'Biaya tambahan (cost) berhasil ditambahkan.');
    }

    public function destroyCost(SalesOrder $salesOrder, SalesOrderCost $cost)
    {
        $cost->delete();

        $salesOrder->load(['items', 'costs']);
        $totalItemVal = $salesOrder->items->sum(fn ($i) => ($i->qty * $i->price));
        $totalCost = $salesOrder->costs->sum('amount');
        $salesOrder->update([
            'total_item_value' => $totalItemVal,
            'total_cost' => $totalCost,
            'grand_total' => $totalItemVal + $totalCost,
        ]);

        return back()->with('message', 'Biaya tambahan (cost) berhasil dihapus.');
    }

    public function updateStatus(Request $request, SalesOrder $salesOrder)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $salesOrder->update(['status' => $validated['status']]);

        NotificationService::notifyUser(
            $request->user()->id,
            'Status Sales Order',
            "Anda mengubah status Sales Order {$salesOrder->id} menjadi: {$validated['status']}",
            "/sales-orders/{$salesOrder->id}"
        );

        return back()->with('message', 'Status Sales Order berhasil diperbarui.');
    }
}
