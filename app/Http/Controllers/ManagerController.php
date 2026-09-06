<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\BusinessUnit;
use App\Models\User;
use App\Models\ActivityLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManagerController extends Controller
{
    /**
     * Display Manager View with active and trash quotations, BU & sales users.
     */
    public function index(Request $request): Response
    {
        $currentUser = $request->user();

        // 1. Fetch active quotations (not soft-deleted and not is_deleted)
        $activeQuotations = Quotation::with(['customer', 'creator', 'sales', 'items.product'])
            ->whereNull('deleted_at')
            ->where('is_deleted', false)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($q) => $this->serializeQuotation($q));

        // 2. Fetch soft-deleted quotations (trash)
        $trashQuotations = Quotation::with(['customer', 'creator', 'sales', 'items.product'])
            ->where(function ($q) {
                $q->whereNotNull('deleted_at')->orWhere('is_deleted', true);
            })
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($q) => $this->serializeQuotation($q));

        // 3. Fetch sales users (Sales & Presales)
        $salesUsers = User::orderBy('name')->get(['id', 'name', 'email', 'role', 'sales_code']);

        // 4. Fetch Business Units with members
        $businessUnits = BusinessUnit::with('members')->orderBy('name')->get()->map(fn($bu) => [
            'id'          => $bu->id,
            'name'        => $bu->name,
            'code'        => $bu->code,
            'color'       => $bu->color,
            'description' => $bu->description,
            'is_active'   => $bu->is_active,
            'members'     => $bu->members->map(fn($m) => [
                'id'         => $m->id,
                'user_id'    => $m->user_id,
                'role_in_bu' => $m->role_in_bu,
            ])->values()->toArray(),
        ]);

        return Inertia::render('Manager', [
            'activeQuotations' => $activeQuotations,
            'trashQuotations'  => $trashQuotations,
            'salesUsers'       => $salesUsers,
            'businessUnits'    => $businessUnits,
        ]);
    }

    /**
     * Restore a soft-deleted quotation.
     */
    public function restore(string $id, Request $request)
    {
        $quotation = Quotation::where(function ($q) use ($id) {
            $q->where('id', $id);
        })->firstOrFail();

        $quotation->update([
            'deleted_at' => null,
            'is_deleted' => false,
        ]);

        $currentUser = $request->user();

        // Log activity
        ActivityLog::create([
            'user_id'     => $currentUser?->id,
            'action'      => 'RESTORE_QUOTATION',
            'entity_type' => 'QUOTATION',
            'entity_id'   => $id,
            'description' => "Memulihkan quotation {$id} dari trash",
        ]);

        // Notify owner
        $ownerId = $quotation->sales_id ?: $quotation->created_by;
        if ($ownerId) {
            Notification::create([
                'user_id' => $ownerId,
                'title'   => "Quotation {$id} Dipulihkan",
                'message' => "Manager memulihkan quotation {$id} dari trash.",
                'link'    => '/quotations',
                'is_read' => false,
            ]);
        }

        return back()->with('message', "Quotation {$id} berhasil dipulihkan!");
    }

    /**
     * Permanently delete a quotation.
     */
    public function forceDelete(string $id, Request $request)
    {
        $quotation = Quotation::where('id', $id)->firstOrFail();

        $quotation->items()->delete();
        $quotation->delete();

        return back()->with('message', "Quotation {$id} telah dihapus secara permanen.");
    }

    /**
     * Batch restore soft-deleted quotations.
     */
    public function batchRestore(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids) || !is_array($ids)) {
            return back()->with('error', 'Tidak ada quotation yang dipilih.');
        }

        $quotations = Quotation::whereIn('id', $ids)->get();
        $currentUser = $request->user();

        foreach ($quotations as $quotation) {
            $quotation->update([
                'deleted_at' => null,
                'is_deleted' => false,
            ]);

            ActivityLog::create([
                'user_id'     => $currentUser?->id,
                'action'      => 'RESTORE_QUOTATION',
                'entity_type' => 'QUOTATION',
                'entity_id'   => $quotation->id,
                'description' => "Memulihkan quotation {$quotation->id} dari trash",
            ]);

            $ownerId = $quotation->sales_id ?: $quotation->created_by;
            if ($ownerId) {
                Notification::create([
                    'user_id' => $ownerId,
                    'title'   => "Quotation {$quotation->id} Dipulihkan",
                    'message' => "Manager memulihkan quotation {$quotation->id} dari trash.",
                    'link'    => '/quotations',
                    'is_read' => false,
                ]);
            }
        }

        $count = count($quotations);
        return back()->with('message', "{$count} quotation berhasil dipulihkan!");
    }

    /**
     * Batch permanently delete quotations.
     */
    public function batchForceDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids) || !is_array($ids)) {
            return back()->with('error', 'Tidak ada quotation yang dipilih.');
        }

        $quotations = Quotation::whereIn('id', $ids)->get();

        foreach ($quotations as $quotation) {
            $quotation->items()->delete();
            $quotation->delete();
        }

        $count = count($quotations);
        return back()->with('message', "{$count} quotation telah dihapus secara permanen.");
    }

    /**
     * Helper to serialize quotation for Manager view including exact grand_total calculation.
     */
    private function serializeQuotation(Quotation $q): array
    {
        // Compute item sum in case grand_total is null/0
        $calculatedSum = $q->items->reduce(function ($sum, $item) {
            $qty = $item->qty ?: 0;
            $price = $item->price ?: 0;
            return $sum + ($qty * $price);
        }, 0);

        // Calculate grand_total (subtotal + tax - pph if applicable)
        $subtotal = $q->subtotal ?: $calculatedSum;
        $grandTotal = $q->grand_total ?: $subtotal;

        return [
            'id'          => $q->id,
            'status'      => $q->status,
            'date'        => $q->date?->toDateString(),
            'expired'     => $q->expired?->toDateString(),
            'created_at'  => $q->created_at?->toIso8601String(),
            'updated_at'  => $q->updated_at?->toIso8601String(),
            'deleted_at'  => $q->deleted_at?->toIso8601String(),
            'grand_total' => (float) $grandTotal,
            'subtotal'    => (float) $subtotal,
            'sales_id'    => $q->sales_id,
            'created_by'  => $q->created_by,
            'bu_id'       => $q->bu_id,
            'customer'    => $q->customer ? [
                'id'   => $q->customer->id,
                'name' => $q->customer->name,
            ] : null,
            'creator'     => $q->creator ? [
                'id'    => $q->creator->id,
                'name'  => $q->creator->name,
                'email' => $q->creator->email,
            ] : ($q->sales ? [
                'id'    => $q->sales->id,
                'name'  => $q->sales->name,
                'email' => $q->sales->email,
            ] : null),
            'sales'       => $q->sales ? [
                'id'   => $q->sales->id,
                'name' => $q->sales->name,
            ] : null,
            'items'       => $q->items->map(fn($i) => [
                'id'    => $i->id,
                'qty'   => $i->qty,
                'price' => $i->price,
            ])->toArray(),
        ];
    }
}
