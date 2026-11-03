<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPic;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);

        $query = Customer::with(['pics', 'quotations'])
            ->withCount('quotations')
            ->withSum(['quotations as total_spend' => fn($q) => $q->where('status', 'approved')], 'grand_total');

        if (!$isManagerOrAdmin) {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhereHas('pics', fn($p) => $p->where('sales_id', $user->id))
                  ->orWhereHas('quotations', fn($qt) =>
                      $qt->where('sales_id', $user->id)->orWhere('created_by', $user->id)
                  );
            });
        }

        $customers = $query->orderBy('name')->get()->map(fn($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'address' => $c->address,
            'pics' => $c->pics->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'email' => $p->email,
                'phone' => $p->phone,
                'is_primary' => (bool)$p->is_primary,
            ]),
            'quotations_count' => $c->quotations_count,
            'total_spend' => $c->total_spend ?? 0,
        ]);

        return Inertia::render('Customers', [
            'customers' => $customers,
        ]);
    }

    public function show(Request $request, Customer $customer): Response
    {
        $user = $request->user();
        $isManagerOrAdmin = in_array($user->role, ['Administrator', 'Sales Manager', 'Manager']);
        $isFinance = $user->role === 'Finance';

        $customer->load(['pics', 'businessUnit']);

        // Load quotations
        $quotationsQuery = $customer->quotations()->with(['sales', 'creator'])
            ->orderByDesc('created_at');
        if (!$isManagerOrAdmin && !$isFinance) {
            $quotationsQuery->where(function ($q) use ($user) {
                $q->where('sales_id', $user->id)->orWhere('created_by', $user->id);
            });
        }
        $quotations = $quotationsQuery->get()->map(fn($q) => [
            'id'          => $q->id,
            'date'        => $q->date?->toDateString(),
            'created_at'  => $q->created_at?->toDateTimeString(),
            'status'      => $q->status,
            'grand_total' => (float) $q->grand_total,
            'po_number'   => $q->po_number,
            'po_date'     => $q->po_date?->toDateString(),
            'sales'       => $q->sales ? ['id' => $q->sales->id, 'name' => $q->sales->name] : null,
        ]);

        // Load sales orders
        $salesOrdersQuery = $customer->salesOrders()->with(['sales', 'quotation.purchaseOrders'])
            ->orderByDesc('created_at');
        if (!$isManagerOrAdmin && !$isFinance) {
            $salesOrdersQuery->where('sales_id', $user->id);
        }
        $salesOrders = $salesOrdersQuery->get()->map(function ($so) {
            $latestPo = $so->quotation?->purchaseOrders?->sortByDesc('created_at')->first();
            $poNumber = $so->po_number ?: $latestPo?->po_number ?: $so->quotation?->po_number;
            $poDate   = $so->po_date?->toDateString() ?: $latestPo?->po_date?->toDateString() ?: $so->quotation?->po_date?->toDateString();
            $poStatus = $so->po_status ?: $latestPo?->status ?: $so->quotation?->po_status;
            $normalizedStatus = strtolower(trim($poStatus ?? ''));
            $hasPo = in_array($normalizedStatus, ['diterima', 'sebagian']) || !empty($poNumber) || !empty($poDate) || !empty($poStatus);

            return [
                'id'          => $so->id,
                'quotation_id' => $so->quotation_id,
                'date'        => $so->date?->toDateString(),
                'created_at'  => $so->created_at?->toDateTimeString(),
                'status'      => $so->status,
                'grand_total' => (float) $so->grand_total,
                'po_number'   => $poNumber,
                'po_date'     => $poDate,
                'po_status'   => $poStatus,
                'has_po'      => $hasPo,
                'sales'       => $so->sales ? ['id' => $so->sales->id, 'name' => $so->sales->name] : null,
            ];
        });

        return Inertia::render('CustomerDetail', [
            'customer'    => [
                'id'      => $customer->id,
                'name'    => $customer->name,
                'address' => $customer->address,
                'pics'    => $customer->pics->map(fn($p) => [
                    'id'         => $p->id,
                    'name'       => $p->name,
                    'email'      => $p->email,
                    'phone'      => $p->phone,
                    'is_primary' => (bool) $p->is_primary,
                ]),
            ],
            'quotations'  => $quotations,
            'salesOrders' => $salesOrders,
        ]);
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:customers,name',
            'address' => 'nullable|string',
            'pics' => 'nullable|array',
            'pics.*.name' => 'required|string|max:255',
            'pics.*.email' => 'nullable|email',
            'pics.*.phone' => 'nullable|string',
            'pics.*.is_primary' => 'nullable|boolean',
        ]);

        $customer = Customer::create([
            'id' => $this->generateCustomerId(),
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        if (!empty($validated['pics'])) {
            foreach ($validated['pics'] as $pic) {
                CustomerPic::create([
                    'customer_id' => $customer->id,
                    'name' => $pic['name'],
                    'email' => $pic['email'] ?? null,
                    'phone' => $pic['phone'] ?? null,
                    'is_primary' => !empty($pic['is_primary']),
                ]);
            }
        }

        NotificationService::notifyUser(
            $request->user()->id,
            'Customer Baru',
            "Anda menambahkan customer baru: {$customer->name}",
            '/customers'
        );

        return back()->with('message', 'Customer berhasil ditambahkan.');
    }

    public function storePic(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'is_primary' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_primary'])) {
            $customer->pics()->update(['is_primary' => false]);
        }

        $pic = CustomerPic::create([
            'customer_id' => $customer->id,
            'name' => trim($validated['name']),
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_primary' => ! empty($validated['is_primary']),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'pic' => [
                'id' => $pic->id,
                'name' => $pic->name,
                'email' => $pic->email,
                'phone' => $pic->phone,
                'is_primary' => (bool) $pic->is_primary,
            ],
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:customers,name,' . $customer->id,
            'address' => 'nullable|string',
            'pics' => 'nullable|array',
            'pics.*.id' => 'nullable',
            'pics.*.name' => 'required|string|max:255',
            'pics.*.email' => 'nullable|email',
            'pics.*.phone' => 'nullable|string',
            'pics.*.is_primary' => 'nullable|boolean',
        ]);

        $customer->update([
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
        ]);

        if (isset($validated['pics'])) {
            // Delete existing and recreate
            $customer->pics()->delete();
            foreach ($validated['pics'] as $pic) {
                CustomerPic::create([
                    'customer_id' => $customer->id,
                    'name' => $pic['name'],
                    'email' => $pic['email'] ?? null,
                    'phone' => $pic['phone'] ?? null,
                    'is_primary' => !empty($pic['is_primary']),
                ]);
            }
        }

        NotificationService::notifyUser(
            $request->user()->id,
            'Customer Diperbarui',
            "Anda memperbarui data customer: {$customer->name}",
            '/customers'
        );

        return back()->with('message', 'Customer berhasil diperbarui.');
    }

    public function destroy(Customer $customer)
    {
        // Check if customer has quotations
        if ($customer->quotations()->count() > 0) {
            return back()->with('error', "Customer \"{$customer->name}\" tidak dapat dihapus karena memiliki quotation terikat.");
        }

        $customerName = $customer->name;
        $customer->pics()->delete();
        $customer->delete();

        NotificationService::notifyUser(
            auth()->id(),
            'Customer Dihapus',
            "Anda menghapus customer: {$customerName}",
            '/customers'
        );

        return back()->with('message', 'Customer berhasil dihapus.');
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->validate(['ids' => 'required|array'])['ids'];

        // Filter out customers with quotations
        $withQuotations = Customer::whereIn('id', $ids)->has('quotations')->count();
        if ($withQuotations > 0) {
            Customer::whereIn('id', $ids)->doesntHave('quotations')->each(function ($c) {
                $c->pics()->delete();
                $c->delete();
            });
            return back()->with('error', 'Sebagian customer tidak dapat dihapus karena memiliki quotation terikat.');
        }

        CustomerPic::whereIn('customer_id', $ids)->delete();
        Customer::whereIn('id', $ids)->delete();

        return back()->with('message', count($ids) . ' customer berhasil dihapus.');
    }

    private function generateCustomerId(): string
    {
        $last = Customer::orderByRaw('CAST(SUBSTRING(id, 2) AS UNSIGNED) DESC')->first();
        $num = $last ? (int)substr($last->id, 1) + 1 : 1;
        return 'C' . str_pad($num, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Merge a duplicate customer (remove_id) into another (keep_id).
     * Reassigns all PICs, Quotations, SOs, and Leads then deletes the duplicate.
     * Only accessible by Admin / Manager.
     */
    public function merge(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['Administrator', 'Sales Manager', 'Manager'])) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        $validated = $request->validate([
            'keep_id'   => 'required|string|exists:customers,id',
            'remove_id' => 'required|string|exists:customers,id|different:keep_id',
        ]);

        $keepId   = $validated['keep_id'];
        $removeId = $validated['remove_id'];

        $keep   = Customer::find($keepId);
        $remove = Customer::find($removeId);

        DB::beginTransaction();
        try {
            // 1. Move PICs — skip duplicates by email
            $keepPicEmails = DB::table('customer_pics')
                ->where('customer_id', $keepId)
                ->pluck('email')
                ->filter()
                ->map(fn($e) => strtolower($e))
                ->toArray();

            $removePics = DB::table('customer_pics')->where('customer_id', $removeId)->get();
            foreach ($removePics as $pic) {
                $emailLower = $pic->email ? strtolower($pic->email) : null;
                if ($emailLower && in_array($emailLower, $keepPicEmails)) {
                    DB::table('customer_pics')->where('id', $pic->id)->delete();
                } else {
                    DB::table('customer_pics')->where('id', $pic->id)->update([
                        'customer_id' => $keepId,
                        'is_primary'  => false,
                    ]);
                }
            }

            // 2. Reassign quotations
            $qMoved = DB::table('quotations')->where('customer_id', $removeId)->count();
            DB::table('quotations')->where('customer_id', $removeId)->update(['customer_id' => $keepId]);

            // 3. Reassign sales orders
            $soMoved = DB::table('sales_orders')->where('customer_id', $removeId)->count();
            DB::table('sales_orders')->where('customer_id', $removeId)->update(['customer_id' => $keepId]);

            // 4. Reassign leads
            $leadMoved = DB::table('leads')->where('customer_id', $removeId)->count();
            DB::table('leads')->where('customer_id', $removeId)->update(['customer_id' => $keepId]);

            // 5. Delete the duplicate
            $remove->pics()->delete(); // safety — should be 0 at this point
            $remove->delete();

            DB::commit();

            return response()->json([
                'message'    => "Customer \"{$remove->name}\" berhasil digabungkan ke \"{$keep->name}\".",
                'stats'      => [
                    'quotations_moved' => $qMoved,
                    'orders_moved'     => $soMoved,
                    'leads_moved'      => $leadMoved,
                ],
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal merge: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Return list of customers with the same name (case-insensitive) for merge UI.
     */
    public function duplicates(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['Administrator', 'Sales Manager', 'Manager'])) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        $groups = DB::table('customers')
            ->select(DB::raw('LOWER(TRIM(name)) as norm_name'), DB::raw('COUNT(*) as cnt'))
            ->groupBy(DB::raw('LOWER(TRIM(name))'))
            ->having('cnt', '>', 1)
            ->get();

        $result = [];
        foreach ($groups as $group) {
            $customers = DB::table('customers')
                ->whereRaw('LOWER(TRIM(name)) = ?', [$group->norm_name])
                ->get()
                ->map(function ($c) {
                    return [
                        'id'         => $c->id,
                        'name'       => $c->name,
                        'created_at' => $c->created_at,
                        'pic_count'  => DB::table('customer_pics')->where('customer_id', $c->id)->count(),
                        'quot_count' => DB::table('quotations')->where('customer_id', $c->id)->count(),
                        'so_count'   => DB::table('sales_orders')->where('customer_id', $c->id)->count(),
                    ];
                });
            $result[] = [
                'norm_name' => $group->norm_name,
                'count'     => $group->cnt,
                'customers' => $customers,
            ];
        }

        return response()->json(['duplicates' => $result]);
    }
}
