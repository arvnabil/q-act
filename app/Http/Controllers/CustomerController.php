<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPic;
use App\Services\NotificationService;
use Illuminate\Http\Request;
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
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

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
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
}
