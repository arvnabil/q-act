<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadVisit;
use App\Models\Quotation;
use App\Models\SystemSetting;
use App\Services\DocumentVisibility;
use App\Services\GoogleCalendarService;
use App\Services\LeadCode;
use App\Services\WorkflowAccess;
use App\Services\ZoomService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkflowController extends Controller
{
    private function family(Quotation $quotation)
    {
        $root = $quotation;
        $seen = [];
        while ($root->parent_quotation_id && ! isset($seen[$root->id])) {
            $seen[$root->id] = true;
            $parent = Quotation::find($root->parent_quotation_id);
            if (! $parent || $parent->is_deleted || $parent->deleted_at || $parent->customer_id !== $quotation->customer_id) {
                break;
            }
            $root = $parent;
        }
        $ids = collect([$root->id]);
        $front = $ids;
        while ($front->isNotEmpty()) {
            $front = Quotation::whereIn('parent_quotation_id', $front)->where('customer_id', $quotation->customer_id)
                ->where('is_deleted', false)->whereNull('deleted_at')->whereNotIn('id', $ids)->pluck('id');
            $ids = $ids->merge($front);
        }

        return [$root, $ids];
    }

    private function payload(Request $request, $lead, $visits, $quotation = null)
    {
        $pics = collect();
        if ($lead) {
            $leadPics = $lead->pics()->select('id', 'name', 'email', 'position', 'phone')->get();
            $custPics = $lead->customer?->pics()->select('id', 'name', 'email', 'position', 'phone')->get() ?? collect();
            $pics = $leadPics->concat($custPics)->unique(fn($p) => mb_strtolower(trim($p->name)))->values();
        } elseif ($quotation?->customer) {
            $pics = $quotation->customer->pics()->select('id', 'name', 'email', 'position', 'phone')->get();
        }

        return [
            'lead' => $lead?->only('id', 'title', 'lead_code'),
            'visits' => $visits->whereIn('user_id', WorkflowAccess::ids($request->user()))->orderBy('scheduled_at')->get(),
            'canManage' => WorkflowAccess::canManage($request->user()),
            'canSchedule' => WorkflowAccess::canSchedule($request->user()),
            'calendarConfigured' => app(GoogleCalendarService::class)->isConfigured(),
            'zoomConfigured' => app(ZoomService::class)->isConfigured() && (bool) $request->user()->has_zoom_license,
            'pics' => $pics,
            'suggestedTitle' => $quotation ? 'Lead '.($quotation->customer?->name ?: $quotation->id) : $lead?->title,
        ];
    }

    private function matchingLeads($user, Quotation $quotation)
    {
        $name = mb_strtolower(trim($quotation->customer?->name ?? ''));
        return WorkflowAccess::leads($user)->active()->where(function ($query) use ($quotation, $name) {
            $query->where('customer_id', $quotation->customer_id);
            if ($name !== '') {
                $query->orWhere(function ($manual) use ($name) {
                    $manual->whereNull('customer_id')->whereRaw('LOWER(TRIM(customer_name)) = ?', [$name]);
                });
            }
        });
    }

    public function quotation(Request $request, Quotation $quotation)
    {
        DocumentVisibility::authorize($request->user(), 'quotations', $quotation);
        [$root, $ids] = $this->family($quotation);
        $visibleIds = DocumentVisibility::apply(Quotation::query(), $request->user(), 'quotations')->whereIn('id', $ids)->pluck('id');
        $lead = $quotation->lead ?: $root->lead;
        if ($lead && ! WorkflowAccess::leads($request->user())->whereKey($lead->id)->exists()) {
            $lead = null;
        }
        $payload = $this->payload($request, $lead, LeadVisit::whereIn('quotation_id', $visibleIds), $quotation);
        $payload['candidates'] = $this->matchingLeads($request->user(), $quotation)
            ->orderByDesc('updated_at')->limit(20)->get(['id', 'title', 'lead_code']);
        $payload['otherQuotations'] = DocumentVisibility::apply(Quotation::query(), $request->user(), 'quotations')
            ->where('customer_id', $quotation->customer_id)->whereNull('parent_quotation_id')->whereNull('lead_id')
            ->whereNotIn('id', $ids)->orderByDesc('date')->limit(50)->get(['id', 'date', 'status']);

        return response()->json($payload)->header('Cache-Control', 'no-store');
    }

    public function lead(Request $request, Lead $lead)
    {
        WorkflowAccess::lead($request->user(), $lead);

        return response()->json($this->payload($request, $lead, LeadVisit::where('lead_id', $lead->id)))->header('Cache-Control', 'no-store');
    }

    public function link(Request $request, Quotation $quotation)
    {
        DocumentVisibility::authorize($request->user(), 'quotations', $quotation);
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
        $data = $request->validate(['lead_id' => 'nullable|uuid|exists:leads,id', 'title' => 'nullable|string|max:255',
            'quotation_ids' => 'sometimes|array|max:50', 'quotation_ids.*' => 'required|string|distinct|exists:quotations,id']);
        $lead = DB::transaction(function () use ($request, $quotation, $data) {
            [$root, $ids] = $this->family($quotation);
            $roots = collect([$root->id]);
            foreach ($data['quotation_ids'] ?? [] as $id) {
                $other = Quotation::findOrFail($id);
                DocumentVisibility::authorize($request->user(), 'quotations', $other);
                if ($other->customer_id !== $root->customer_id) {
                    throw ValidationException::withMessages(['quotation_ids' => 'Semua quotation harus milik customer yang sama.']);
                }
                [$otherRoot, $otherIds] = $this->family($other);
                $roots->push($otherRoot->id);
                $ids = $ids->merge($otherIds);
            }
            // Stable lock order protects repeat clicks and concurrent grouping requests.
            Quotation::whereIn('id', $roots->unique())->orderBy('id')->lockForUpdate()->get();
            $family = Quotation::whereIn('id', $ids->unique())->orderBy('id')->lockForUpdate()->get();
            $root = $family->firstWhere('id', $root->id);
            foreach ($family as $q) {
                abort_unless(DocumentVisibility::apply(Quotation::query(), $request->user(), 'quotations')->whereKey($q->id)->exists(), 403);
            }
            $existing = $family->pluck('lead_id')->filter()->unique();
            if ($existing->count() > 1 || ($existing->isNotEmpty() && ! empty($data['lead_id']) && $existing->first() !== $data['lead_id'])) {
                throw ValidationException::withMessages(['lead_id' => 'Dokumen ini sudah terkait proyek lain. Hubungan tidak diubah otomatis.']);
            }
            $lead = $existing->isNotEmpty() ? Lead::findOrFail($existing->first()) : null;
            if (! $lead && ! empty($data['lead_id'])) {
                $lead = WorkflowAccess::leads($request->user())->active()->whereKey($data['lead_id'])->firstOrFail();
                if (! $this->matchingLeads($request->user(), $root)->whereKey($lead->id)->exists()) {
                    throw ValidationException::withMessages(['lead_id' => 'Customer proyek harus sama dengan quotation.']);
                }
            }
            if (! $lead) {
                $stages = collect(SystemSetting::find('lead_pipeline_settings')?->value['stages'] ?? []);
                $lead = Lead::create(['lead_code' => LeadCode::next(), 'title' => ($data['title'] ?? null) ?: 'Lead '.($root->customer?->name ?: $root->id),
                    'customer_id' => $root->customer_id, 'sales_id' => $root->sales_id ?: $root->created_by,
                    'bu_id' => $root->bu_id, 'created_by' => $request->user()->id,
                    'stage' => $stages->firstWhere('type', 'normal')['key'] ?? 'lead_masuk',
                    'estimated_value' => $root->grand_total, 'quotation_id' => $root->id]);
            }
            WorkflowAccess::lead($request->user(), $lead);
            if ($lead->customer_id && $lead->customer_id !== $root->customer_id) {
                throw ValidationException::withMessages(['lead_id' => 'Customer proyek harus sama dengan quotation.']);
            }
            if (! $lead->customer_id) {
                $lead->customer_id = $root->customer_id;
            }
            // Copy missing customer/contact data, never overwrite manually entered values.
            WorkflowAccess::fillFromQuotation($lead, $root, $request->user());
            foreach ($family as $q) {
                if (! $q->lead_id) {
                    $q->update(['lead_id' => $lead->id]);
                    LeadActivity::create(['lead_id' => $lead->id, 'user_id' => $request->user()->id, 'type' => 'quotation_linked',
                        'title' => 'Quotation '.$q->id.' dihubungkan', 'metadata' => ['quotation_id' => $q->id]]);
                }
            }
            LeadVisit::whereIn('quotation_id', $ids)->whereNull('lead_id')->update(['lead_id' => $lead->id]);

            return $lead;
        });

        return response()->json(['lead' => $lead->only('id', 'title')]);
    }

    public function cancel(Request $request, LeadVisit $visit)
    {
        WorkflowAccess::visit($request->user(), $visit);
        if ($visit->cancelled_at) {
            return response()->json(['message' => 'Agenda sudah dibatalkan.']);
        }
        abort_if($visit->checked_in_at, 422, 'Agenda sudah selesai.');
        $visit->update(['cancelled_at' => now()]);
        $warnings = [];
        try {
            if ($visit->gc_event_id && ! app(GoogleCalendarService::class)->deleteEvent($visit->gc_event_id)) {
                $warnings[] = 'Google Calendar belum berhasil diperbarui.';
            }
        } catch (\Throwable $e) {
            $warnings[] = 'Google Calendar belum berhasil diperbarui.';
        }
        try {
            if ($visit->zoom_meeting_id && ! app(ZoomService::class)->deleteMeeting($visit->zoom_meeting_id)) {
                $warnings[] = 'Zoom belum berhasil dibatalkan.';
            }
        } catch (\Throwable $e) {
            $warnings[] = 'Zoom belum berhasil dibatalkan.';
        }
        if ($visit->lead_id) {
            LeadActivity::create(['lead_id' => $visit->lead_id, 'user_id' => $request->user()->id,
                'type' => 'visit', 'title' => mb_substr('Agenda dibatalkan: '.$visit->subject, 0, 255), 'metadata' => ['visit_id' => $visit->id]]);
        }

        return response()->json(['message' => 'Agenda dibatalkan.', 'warnings' => $warnings]);
    }
}
