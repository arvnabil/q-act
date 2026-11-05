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

        $query = Customer::with('pics')
            ->withCount(['quotations' => fn ($q) => \App\Services\DocumentVisibility::apply($q, $user, 'quotations')])
            ->withSum(['quotations as total_spend' => fn ($q) => \App\Services\DocumentVisibility::apply($q, $user, 'quotations')->where('status', 'approved')], 'grand_total');

        \App\Services\DocumentVisibility::apply($query, $user, 'customers');

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
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        $user = $request->user();

        $customer->load(['pics', 'businessUnit']);

        // Load quotations
        $quotationsQuery = $customer->quotations()->with(['sales', 'creator'])
            ->orderByDesc('created_at');
        \App\Services\DocumentVisibility::apply($quotationsQuery, $user, 'quotations');
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
        \App\Services\DocumentVisibility::apply($salesOrdersQuery, $user, 'sales_orders');
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
                'crm_profile' => $customer->crm_profile ?? [],
                'pics'    => $customer->pics->map(fn($p) => [
                    'id'         => $p->id,
                    'name'       => $p->name,
                    'email'      => $p->email,
                    'phone'      => $p->phone,
                    'position'   => $p->position,
                    'is_primary' => (bool) $p->is_primary,
                    'crm_profile' => $p->crm_profile ?? [],
                ]),
            ],
            'quotations'  => $quotations,
            'salesOrders' => $salesOrders,
        ]);
    }


    public function updateProfile(Request $request, Customer $customer)
    {
        abort_unless(\App\Services\DocumentVisibility::allows($request->user(), 'customers_edit'), 403);
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        $rules = [];
        foreach (['legal_name', 'industry', 'npwp', 'tax_name', 'source', 'category'] as $field) {
            $rules[$field] = 'nullable|string|max:255';
        }
        foreach (['address', 'billing_address', 'shipping_address', 'tax_address', 'billing_instructions', 'notes'] as $field) {
            $rules[$field] = 'nullable|string|max:5000';
        }
        foreach (['website', 'procurement_website', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'x'] as $field) {
            $rules[$field] = ['nullable', 'url:http,https', 'max:2048'];
        }
        $rules['anniversary'] = 'nullable|date_format:Y-m-d|before_or_equal:today';
        $rules['company_email'] = 'nullable|email|max:255';
        $rules['billing_email'] = 'nullable|email|max:255';
        $rules['company_phone'] = 'nullable|string|max:50';
        $rules['payment_terms_days'] = 'nullable|integer|min:0|max:365';
        $rules['billing_same_as_office'] = 'required|boolean';
        $rules['shipping_same_as_office'] = 'required|boolean';
        $rules['npwp_file'] = 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:3072';
        $rules['remove_npwp_file'] = 'sometimes|boolean';
        $data = $request->validate($rules);
        $disk = \Illuminate\Support\Facades\Storage::disk('local');
        $old = $customer->crm_profile['npwp_document'] ?? null;
        $newPath = null;
        if ($request->hasFile('npwp_file')) {
            $newPath = $request->file('npwp_file')->store('customer-npwp', 'local');
            abort_unless($newPath, 500, 'Dokumen NPWP gagal disimpan.');
        }
        try {
            DB::transaction(function () use ($customer, $request, $data, $newPath) {
                $locked = Customer::whereKey($customer->id)->lockForUpdate()->firstOrFail();
                $profile = array_merge($locked->crm_profile ?? [], \Illuminate\Support\Arr::except($data, ['address', 'npwp_file', 'remove_npwp_file']));
                if ($request->boolean('remove_npwp_file')) unset($profile['npwp_document']);
                if ($newPath) $profile['npwp_document'] = ['path' => $newPath, 'name' => $request->file('npwp_file')->getClientOriginalName()];
                $updates = ['crm_profile' => $profile];
                if (array_key_exists('address', $data)) $updates['address'] = $data['address'];
                $locked->update($updates);
            });
        } catch (\Throwable $e) {
            if ($newPath) $disk->delete($newPath);
            throw $e;
        }
        if (($newPath || $request->boolean('remove_npwp_file')) && !empty($old['path'])) $disk->delete($old['path']);
        return back()->with('message', 'Informasi perusahaan berhasil disimpan.');
    }

    public function npwpDocument(Request $request, Customer $customer)
    {
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        $doc = $customer->crm_profile['npwp_document'] ?? null;
        abort_unless($doc && \Illuminate\Support\Facades\Storage::disk('local')->exists($doc['path']), 404);
        return \Illuminate\Support\Facades\Storage::disk('local')->response($doc['path'], $doc['name'], ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }

    public function updatePicProfile(Request $request, Customer $customer, CustomerPic $pic)
    {
        abort_unless(\App\Services\DocumentVisibility::allows($request->user(), 'customers_edit'), 403);
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        abort_unless($pic->customer_id === $customer->id, 404);
        $rules = ['birthday' => 'nullable|date_format:Y-m-d|before_or_equal:today'];
        foreach (['instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'x'] as $key) $rules[$key] = ['nullable', 'url:http,https', 'max:2048'];
        $pic->update(['crm_profile' => $request->validate($rules)]);
        return back()->with('message', 'Informasi PIC berhasil disimpan.');
    }

    public function updatePic(Request $request, Customer $customer, CustomerPic $pic)
    {
        abort_unless(\App\Services\DocumentVisibility::allows($request->user(), 'customers_edit'), 403);
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        abort_unless($pic->customer_id === $customer->id, 404);

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'nullable|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'position'   => 'nullable|string|max:255',
            'is_primary' => 'boolean',
            // CRM profile fields
            'birthday'   => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'instagram'  => ['nullable', 'url:http,https', 'max:2048'],
            'linkedin'   => ['nullable', 'url:http,https', 'max:2048'],
            'facebook'   => ['nullable', 'url:http,https', 'max:2048'],
            'youtube'    => ['nullable', 'url:http,https', 'max:2048'],
            'tiktok'     => ['nullable', 'url:http,https', 'max:2048'],
            'x'          => ['nullable', 'url:http,https', 'max:2048'],
        ]);

        DB::transaction(function () use ($customer, $pic, $validated) {
            if (! empty($validated['is_primary'])) {
                $customer->pics()->where('id', '!=', $pic->id)->update(['is_primary' => false]);
            }

            $crmProfile = $pic->crm_profile ?? [];
            foreach (['birthday', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'x'] as $key) {
                $crmProfile[$key] = $validated[$key] ?? null;
            }

            $pic->update([
                'name'        => trim($validated['name']),
                'email'       => $validated['email'] ?? null,
                'phone'       => $validated['phone'] ?? null,
                'position'    => $validated['position'] ?? null,
                'is_primary'  => ! empty($validated['is_primary']),
                'crm_profile' => $crmProfile,
            ]);
        });

        return back()->with('message', 'Data PIC berhasil diperbarui.');
    }

    public function destroyPic(Request $request, Customer $customer, CustomerPic $pic)
    {
        abort_unless(\App\Services\DocumentVisibility::allows($request->user(), 'customers_edit'), 403);
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);
        abort_unless($pic->customer_id === $customer->id, 404);
        // Cannot delete the only PIC
        abort_if($customer->pics()->count() <= 1, 422, 'Customer harus memiliki minimal 1 PIC.');

        $wasPrimary = $pic->is_primary;
        $pic->delete();

        // Promote another PIC to primary if the deleted one was primary
        if ($wasPrimary) {
            $customer->pics()->oldest()->first()?->update(['is_primary' => true]);
        }

        return back()->with('message', 'PIC berhasil dihapus.');
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
        abort_unless(\App\Services\DocumentVisibility::allows($request->user(), 'customers_edit'), 403);
        \App\Services\DocumentVisibility::authorize($request->user(), 'customers', $customer);

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'position'   => 'nullable|string|max:255',
            'email'      => 'nullable|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'is_primary' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_primary'])) {
            $customer->pics()->update(['is_primary' => false]);
        }

        $pic = CustomerPic::create([
            'customer_id' => $customer->id,
            'name'        => trim($validated['name']),
            'position'    => $validated['position'] ?? null,
            'email'       => $validated['email'] ?? null,
            'phone'       => $validated['phone'] ?? null,
            'is_primary'  => ! empty($validated['is_primary']),
            'created_by'  => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'pic' => [
                    'id'         => $pic->id,
                    'name'       => $pic->name,
                    'position'   => $pic->position,
                    'email'      => $pic->email,
                    'phone'      => $pic->phone,
                    'is_primary' => (bool) $pic->is_primary,
                ],
            ]);
        }

        return back()->with('message', 'PIC berhasil ditambahkan.');
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

        DB::transaction(function () use ($customer, $validated) {
            $customer->update(['name' => $validated['name'], 'address' => $validated['address'] ?? null]);
            if (isset($validated['pics'])) {
                $kept = [];
                foreach ($validated['pics'] as $pic) {
                    $record = !empty($pic['id']) ? $customer->pics()->whereKey($pic['id'])->firstOrFail() : new CustomerPic(['customer_id' => $customer->id]);
                    $record->fill(['name' => $pic['name'], 'email' => $pic['email'] ?? null, 'phone' => $pic['phone'] ?? null, 'is_primary' => !empty($pic['is_primary'])]);
                    $record->save();
                    $kept[] = $record->id;
                }
                $customer->pics()->whereNotIn('id', $kept)->delete();
            }
        });

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
