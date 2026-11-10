<?php

namespace App\Http\Controllers;

use App\Jobs\SyncDocumentsToSharePoint;
use App\Models\SharePointDocument;
use App\Services\DocumentVisibility;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentCenterController extends Controller
{
    /**
     * Display all synchronized SharePoint documents.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless(DocumentVisibility::allows($user, 'sharepoint_view'), 403);

        $query = SharePointDocument::with([
            'quotation.customer',
            'quotation.sales',
            'purchaseOrder',
            'uploader',
        ])
        ->whereHas('quotation', fn ($q) => DocumentVisibility::apply($q, $user, 'quotations'));

        // Search
        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('original_filename', 'like', "%{$search}%")
                  ->orWhere('quotation_id', 'like', "%{$search}%")
                  ->orWhereHas('purchaseOrder', fn ($p) => $p->where('po_number', 'like', "%{$search}%"))
                  ->orWhereHas('quotation.customer', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('quotation.sales', fn ($s) => $s->where('name', 'like', "%{$search}%"));
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Date range filter
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Summary counts
        $baseCountQuery = SharePointDocument::whereHas('quotation', fn ($q) => DocumentVisibility::apply($q, $user, 'quotations'));
        $stats = [
            'total'     => (clone $baseCountQuery)->count(),
            'synced'    => (clone $baseCountQuery)->where('status', 'synced')->count(),
            'failed'    => (clone $baseCountQuery)->where('status', 'failed')->count(),
            'pending'   => (clone $baseCountQuery)->whereIn('status', ['pending', 'uploading'])->count(),
        ];

        $documents = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return Inertia::render('DocumentCenter/Index', [
            'documents' => $documents,
            'filters'   => $request->only(['search', 'status', 'date_from', 'date_to']),
            'stats'     => $stats,
            'canUpload' => DocumentVisibility::allows($user, 'sharepoint_upload'),
        ]);
    }

    /**
     * Admin monitor for failed or pending document synchronizations.
     */
    public function syncMonitor(Request $request): Response
    {
        $user = $request->user();
        abort_unless(DocumentVisibility::allows($user, 'sharepoint_upload'), 403);

        $query = SharePointDocument::with([
            'quotation.customer',
            'quotation.sales',
            'purchaseOrder',
            'uploader',
        ])
        ->whereHas('quotation', fn ($q) => DocumentVisibility::apply($q, $user, 'quotations'));

        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        } else {
            // Default to failed or pending
            $query->whereIn('status', ['failed', 'pending', 'uploading']);
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('original_filename', 'like', "%{$search}%")
                  ->orWhere('quotation_id', 'like', "%{$search}%")
                  ->orWhereHas('purchaseOrder', fn ($p) => $p->where('po_number', 'like', "%{$search}%"))
                  ->orWhereHas('quotation.customer', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        $documents = $query->orderByDesc('updated_at')->paginate(20)->withQueryString();

        return Inertia::render('DocumentCenter/SyncMonitor', [
            'documents' => $documents,
            'filters'   => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Manually retry syncing a document to SharePoint.
     */
    public function retrySync(Request $request, SharePointDocument $document)
    {
        $user = $request->user();
        abort_unless(DocumentVisibility::allows($user, 'sharepoint_upload'), 403);

        if (!$document->purchase_order_id) {
            return back()->withErrors(['message' => 'Dokumen tidak memiliki ID Purchase Order yang valid.']);
        }

        $document->update([
            'status'        => 'pending',
            'error_message' => null,
        ]);

        dispatch(new SyncDocumentsToSharePoint(
            quotationId: $document->quotation_id,
            purchaseOrderId: $document->purchase_order_id,
            uploadedBy: $user->id,
        ));

        return back()->with('message', "Sinkronisasi ulang dimulai untuk dokumen {$document->original_filename}.");
    }
}
