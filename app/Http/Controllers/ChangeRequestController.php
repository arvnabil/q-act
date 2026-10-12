<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ChangeRequest;
use App\Models\Notification;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChangeRequestController extends Controller
{
    public function store(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'type' => 'required|in:revision,cancellation',
            'reason' => 'required|string|min:5|max:2000',
        ]);

        if (! in_array($quotation->status, ['approved', 'sent'], true)) {
            return back()->with('error', 'Pengajuan hanya dapat dibuat untuk quotation yang sudah dikirim atau menjadi PO.');
        }

        $user = $request->user();
        $isManager = in_array($user->role, ['Administrator', 'Manager', 'Sales Manager'], true);
        if (! $isManager && ! in_array($user->id, [$quotation->sales_id, $quotation->created_by], true)) {
            return back()->with('error', 'Anda bukan sales yang menangani quotation ini.');
        }

        $salesOrder = $quotation->salesOrders()->latest()->first();
        if (! $salesOrder) {
            return back()->with('error', 'Sales Order untuk quotation ini belum ditemukan.');
        }

        $alreadyPending = $quotation->changeRequests()->where('status', 'pending')->exists();
        if ($alreadyPending) {
            return back()->with('error', 'Masih ada pengajuan perubahan yang menunggu persetujuan manager.');
        }

        $changeRequest = ChangeRequest::create([
            'type' => $data['type'],
            'quotation_id' => $quotation->id,
            'sales_order_id' => $salesOrder->id,
            'requested_by' => $user->id,
            'reason' => $data['reason'],
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'CHANGE_REQUEST_CREATED',
            'entity_type' => 'QUOTATION',
            'entity_id' => $quotation->id,
            'description' => "Pengajuan {$data['type']} untuk {$quotation->id}: {$data['reason']}",
        ]);

        $managers = \App\Models\User::whereIn('role', ['Administrator', 'Manager', 'Sales Manager'])->get();
        foreach ($managers as $manager) {
            Notification::create([
                'user_id' => $manager->id,
                'title' => 'Pengajuan perubahan quotation',
                'message' => "{$user->name} mengajukan {$data['type']} untuk {$quotation->id}.",
                'link' => '/manager',
                'is_read' => false,
            ]);
        }

        return back()->with('message', 'Pengajuan berhasil dikirim ke manager.');
    }

    public function approve(Request $request, ChangeRequest $changeRequest)
    {
        if ($changeRequest->status !== 'pending') {
            return back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        $newQuotation = DB::transaction(function () use ($request, $changeRequest) {
            $quotation = $changeRequest->quotation()->with('items')->lockForUpdate()->firstOrFail();
            $salesOrder = $changeRequest->salesOrder()->lockForUpdate()->first();
            $newQuotation = null;

            if ($changeRequest->type === 'cancellation') {
                $quotation->update(['status' => 'cancelled', 'updated_by' => $request->user()->id]);
                $salesOrder?->update(['status' => 'Cancelled']);
            } else {
                $quotation->update(['status' => 'superseded', 'updated_by' => $request->user()->id]);
                $salesOrder?->update(['status' => 'Revised', 'parent_sales_order_id' => $salesOrder->parent_sales_order_id ?? null]);
                $newQuotation = $this->cloneAsRevision($quotation, $salesOrder, $changeRequest->requested_by, $request->user()->id);
            }

            $changeRequest->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'resulting_quotation_id' => $newQuotation?->id,
                'manager_comment' => $request->input('manager_comment'),
            ]);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'CHANGE_REQUEST_APPROVED',
                'entity_type' => 'QUOTATION',
                'entity_id' => $quotation->id,
                'description' => $changeRequest->type === 'revision'
                    ? "Revisi disetujui. Quotation baru {$newQuotation->id} dibuat dari {$quotation->id}."
                    : "Pembatalan disetujui untuk {$quotation->id} dan SO terkait.",
            ]);

            return $newQuotation;
        });

        $message = $newQuotation
            ? "Revisi disetujui. Quotation baru {$newQuotation->id} siap diedit."
            : 'Pembatalan quotation dan Sales Order berhasil disetujui.';

        return back()->with('message', $message);
    }

    public function reject(Request $request, ChangeRequest $changeRequest)
    {
        if ($changeRequest->status !== 'pending') {
            return back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        $data = $request->validate(['manager_comment' => 'required|string|min:3|max:2000']);
        $changeRequest->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'manager_comment' => $data['manager_comment'],
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CHANGE_REQUEST_REJECTED',
            'entity_type' => 'QUOTATION',
            'entity_id' => $changeRequest->quotation_id,
            'description' => "Pengajuan ditolak: {$data['manager_comment']}",
        ]);

        return back()->with('message', 'Pengajuan ditolak dan alasannya tersimpan di riwayat.');
    }

    public function createFromCancelled(Request $request, Quotation $quotation)
    {
        if ($quotation->status !== 'cancelled') {
            return back()->with('error', 'Penawaran baru dari flow ini hanya dapat dibuat dari quotation yang sudah dibatalkan.');
        }

        $quotation->load('items');
        $newQuotation = DB::transaction(fn () => $this->cloneAsRevision($quotation, $quotation->sourceSalesOrder, $request->user()->id, $request->user()->id));

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'NEW_QUOTATION_FROM_CANCELLED',
            'entity_type' => 'QUOTATION',
            'entity_id' => $quotation->id,
            'description' => "Quotation baru {$newQuotation->id} dibuat dari quotation batal {$quotation->id}.",
        ]);

        return redirect()->route('quotations.edit', $newQuotation->id)
            ->with('message', "Quotation baru {$newQuotation->id} dibuat sebagai draft revisi.");
    }

    private function cloneAsRevision(Quotation $source, ?SalesOrder $salesOrder, string $createdBy, string $updatedBy): Quotation
    {
        $revisionNumber = ((int) $source->revisions()->where('relation_type', 'revision')->max('revision_no')) + 1;
        $id = $source->id.'-R'.$revisionNumber;
        while (Quotation::where('id', $id)->exists()) {
            $revisionNumber++;
            $id = $source->id.'-R'.$revisionNumber;
        }

        $new = Quotation::create([
            'id' => $id,
            'customer_id' => $source->customer_id,
            'pic_id' => $source->pic_id,
            'sales_id' => $source->sales_id,
            'bu_id' => $source->bu_id,
            'bank_account_id' => $source->bank_account_id,
            'status' => 'revision_draft',
            'date' => now()->toDateString(),
            'expired' => now()->addDays(30)->toDateString(),
            'calc_tax' => $source->calc_tax,
            'show_tax' => $source->show_tax,
            'ppn_rate' => $source->ppn_rate,
            'calc_pph' => $source->calc_pph,
            'show_pph' => $source->show_pph,
            'pph_rate' => $source->pph_rate,
            'notes' => $source->notes,
            'terms' => $source->terms,
            'subtotal' => $source->subtotal,
            'tax_amount' => $source->tax_amount,
            'grand_total' => $source->grand_total,
            'parent_quotation_id' => $source->id,
            'source_sales_order_id' => $salesOrder?->id,
            'revision_no' => $revisionNumber,
            'relation_type' => 'revision',
            'created_by' => $createdBy,
            'updated_by' => $updatedBy,
        ]);

        foreach ($source->items as $item) {
            QuotationItem::create([
                'quotation_id' => $new->id,
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

        return $new;
    }
}
