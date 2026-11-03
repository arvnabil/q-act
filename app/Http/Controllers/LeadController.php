<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadVisit;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LeadController extends Controller
{
    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function isManagerOrAdmin(): bool
    {
        $user = Auth::user();
        if (!$user) return false;
        if (in_array($user->role, ['Administrator', 'Sales Manager', 'Manager', 'Super Admin'])) {
            return true;
        }
        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['Administrator', 'Sales Manager', 'Manager', 'Super Admin'])) {
            return true;
        }
        if (method_exists($user, 'can') && ($user->can('manage_settings') || $user->can('manager_view') || $user->can('manage_leads'))) {
            return true;
        }
        return false;
    }

    private function getPipelineSettings(): array
    {
        $defaultStages = [
            ['key' => 'data_masuk',      'name' => 'Data Masuk',      'type' => 'normal', 'color' => '#94A3B8'],
            ['key' => 'sph_terlayang',   'name' => 'SPH Terlayang',   'type' => 'normal', 'color' => '#3B82F6'],
            ['key' => 'hot_progress',    'name' => 'Hot Progress',    'type' => 'normal', 'color' => '#F59E0B'],
            ['key' => 'proyek_deal',     'name' => 'Proyek Deal',     'type' => 'deal',   'color' => '#009680'],
            ['key' => 'proyek_berjalan', 'name' => 'Proyek Berjalan', 'type' => 'normal', 'color' => '#8B5CF6'],
            ['key' => 'proyek_selesai',  'name' => 'Proyek Selesai',  'type' => 'normal', 'color' => '#10B981'],
            ['key' => 'no_deal',         'name' => 'No Deal',         'type' => 'lost',   'color' => '#EF4444'],
        ];

        $setting = SystemSetting::find('lead_pipeline_settings');
        if (!$setting || empty($setting->value)) {
            return [
                'featured_stage_1' => 'hot_progress',
                'featured_stage_2' => 'proyek_deal',
                'stages'           => $defaultStages,
            ];
        }

        $val = $setting->value;
        return [
            'featured_stage_1' => $val['featured_stage_1'] ?? 'hot_progress',
            'featured_stage_2' => $val['featured_stage_2'] ?? 'proyek_deal',
            'stages'           => $val['stages'] ?? $defaultStages,
        ];
    }

    private function generateLeadCode(): string
    {
        $prefix = 'L' . now()->format('ym') . '.';
        $last = Lead::where('lead_code', 'like', $prefix . '%')
            ->orderByDesc('lead_code')
            ->value('lead_code');

        $seq = 1;
        if ($last) {
            $parts = explode('.', $last);
            $seq = (int) end($parts) + 1;
        }

        return $prefix . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }

    private function convertToCustomer(Lead $lead): ?Customer
    {
        $name = $lead->customer_name ?? $lead->title;

        // Duplicate check by name or email
        $existing = Customer::where('name', $name)->first();
        if (!$existing && $lead->customer_email) {
            $existing = Customer::where('email', $lead->customer_email)->first();
        }
        if ($existing) {
            // Link existing customer to lead
            $lead->update(['customer_id' => $existing->id]);
            return $existing;
        }

        // Generate new customer ID (same pattern as existing: C + 6 digits)
        $lastCustomer = Customer::orderByDesc('id')->first();
        $newSeq = 100001;
        if ($lastCustomer && preg_match('/^C(\d+)$/', $lastCustomer->id, $m)) {
            $newSeq = (int)$m[1] + 1;
        }
        $customerId = 'C' . $newSeq;

        $customer = Customer::create([
            'id'         => $customerId,
            'name'       => $name,
            'address'    => $lead->customer_address,
            'bu_id'      => $lead->bu_id,
            'created_by' => Auth::id(),
        ]);

        $lead->update([
            'customer_id'  => $customer->id,
            'converted_at' => now(),
        ]);

        return $customer;
    }

    private function logActivity(Lead $lead, string $type, string $title, ?string $description = null, array $metadata = []): void
    {
        LeadActivity::create([
            'lead_id'     => $lead->id,
            'user_id'     => Auth::id(),
            'type'        => $type,
            'title'       => $title,
            'description' => $description,
            'metadata'    => $metadata ?: null,
        ]);
    }

    // ─── Leads Index ────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $isManagerOrAdmin = $this->isManagerOrAdmin();

        $query = Lead::active()
            ->with(['sales:id,name', 'customer:id,name', 'quotation:id,status'])
            ->orderBy('sort_order')
            ->orderByDesc('created_at');

        // RBAC
        if (!$isManagerOrAdmin) {
            $query->forUser(Auth::id());
        }

        // Filters
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }
        if ($request->filled('sales_id') && $isManagerOrAdmin) {
            $query->where('sales_id', $request->sales_id);
        }
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)
                    ->orWhere('customer_name', 'like', $s)
                    ->orWhere('customer_phone', 'like', $s)
                    ->orWhere('lead_code', 'like', $s);
            });
        }

        $leads = $query->get();

        // Group by stage for Kanban
        $grouped = [];
        foreach (Lead::STAGES as $stage) {
            $grouped[$stage] = $leads->where('stage', $stage)->values();
        }

        // Stats
        $stats = [
            'total'           => $leads->count(),
            'byStage'         => $leads->groupBy('stage')->map->count(),
            'totalEstimated'  => $leads->sum('estimated_value'),
            'dealsWon'        => $leads->where('stage', 'proyek_selesai')->count(),
            'hotProgress'     => $leads->where('stage', 'hot_progress')->count(),
            'proyekDeal'      => $leads->where('stage', 'proyek_deal')->count(),
        ];

        // Sales users for filter (manager only)
        $salesUsers = [];
        if ($isManagerOrAdmin) {
            $salesUsers = User::whereIn('role', ['Sales', 'Presales', 'Sales Rep'])
                ->select('id', 'name')
                ->orderBy('name')
                ->get();
        }

        return Inertia::render('Leads', [
            'grouped'          => $grouped,
            'stats'            => $stats,
            'salesUsers'       => $salesUsers,
            'filters'          => $request->only(['stage', 'sales_id', 'search']),
            'isManagerOrAdmin' => $isManagerOrAdmin,
            'stages'           => Lead::STAGES,
            'sources'          => Lead::SOURCES,
            'customers'        => Customer::select('id', 'name')->orderBy('name')->get(),
            'pipelineSettings' => $this->getPipelineSettings(),
        ]);
    }

    // ─── Store ──────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'customer_id'     => 'nullable|string|exists:customers,id',
            'customer_name'   => 'nullable|string|max:255',
            'customer_phone'  => 'nullable|string|max:50',
            'customer_email'  => 'nullable|email|max:100',
            'customer_address'=> 'nullable|string',
            'pic_name'        => 'nullable|string|max:255',
            'pic_phone'       => 'nullable|string|max:50',
            'sales_id'        => 'nullable|uuid|exists:users,id',
            'bu_id'           => 'nullable|uuid|exists:business_units,id',
            'stage'           => 'nullable|string|in:' . implode(',', Lead::STAGES),
            'source'          => 'nullable|string|max:100',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
            'tags'            => 'nullable|array',
        ]);

        $data['created_by'] = Auth::id();
        $data['updated_by'] = Auth::id();
        $data['sales_id']   = $data['sales_id'] ?? Auth::id();
        $data['stage']      = $data['stage'] ?? 'data_masuk';
        $data['lead_code']  = $this->generateLeadCode();

        // If customer_id given, populate denormalised fields from Customer
        if (!empty($data['customer_id'])) {
            $c = Customer::find($data['customer_id']);
            if ($c) {
                $data['customer_name']    = $data['customer_name'] ?? $c->name;
                $data['customer_address'] = $data['customer_address'] ?? $c->address;
            }
        }

        $lead = Lead::create($data);

        $this->logActivity($lead, 'note', 'Lead dibuat', 'Lead baru ditambahkan: ' . $lead->title);

        return back()->with('message', 'Lead berhasil dibuat.');
    }

    // ─── Show ───────────────────────────────────────────────────────────────────

    public function show(Lead $lead)
    {
        $lead->load([
            'sales:id,name',
            'customer:id,name,address',
            'quotation:id,status,grand_total,revision_no',
            'quotations:id,lead_id,status,grand_total,created_at,revision_no,relation_type',
            'pics.customerPic',
            'visits.user:id,name',
        ]);

        // Load activities sorted newest first
        $lead->setRelation('activities',
            $lead->activities()->with('user:id,name')->orderByDesc('created_at')->get()
        );

        return Inertia::render('LeadDetail', [
            'lead'    => $lead,
            'stages'  => Lead::STAGES,
            'sources' => Lead::SOURCES,
        ]);
    }

    // ─── Update ─────────────────────────────────────────────────────────────────

    public function update(Request $request, Lead $lead)
    {
        $data = $request->validate([
            'title'           => 'sometimes|required|string|max:255',
            'customer_id'     => 'nullable|string|exists:customers,id',
            'customer_name'   => 'nullable|string|max:255',
            'customer_phone'  => 'nullable|string|max:50',
            'customer_email'  => 'nullable|email|max:100',
            'customer_address'=> 'nullable|string',
            'pic_name'        => 'nullable|string|max:255',
            'pic_phone'       => 'nullable|string|max:50',
            'sales_id'        => 'nullable|uuid|exists:users,id',
            'source'          => 'nullable|string|max:100',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
            'tags'            => 'nullable|array',
        ]);

        $data['updated_by'] = Auth::id();

        $lead->update($data);

        $this->logActivity($lead, 'note', 'Lead diperbarui');

        return back()->with('message', 'Lead berhasil diperbarui.');
    }

    // ─── Update Stage ────────────────────────────────────────────────────────────

    public function updateStage(Request $request, Lead $lead)
    {
        $data = $request->validate([
            'stage'       => 'required|string|in:' . implode(',', Lead::STAGES),
            'lost_reason' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer',
        ]);

        $oldStage = $lead->stage;
        $newStage = $data['stage'];

        $updateData = [
            'stage'      => $newStage,
            'updated_by' => Auth::id(),
        ];

        if (isset($data['sort_order'])) {
            $updateData['sort_order'] = $data['sort_order'];
        }

        if ($newStage === 'no_deal' && isset($data['lost_reason'])) {
            $updateData['lost_reason'] = $data['lost_reason'];
        }

        $lead->update($updateData);

        // Log stage change
        $this->logActivity(
            $lead,
            'stage_change',
            'Stage diubah: ' . $oldStage . ' → ' . $newStage,
            $data['lost_reason'] ?? null,
            ['from' => $oldStage, 'to' => $newStage]
        );

        // Auto-convert to customer on deal
        if ($newStage === 'proyek_deal' && !$lead->customer_id) {
            $this->convertToCustomer($lead);
        }

        // Return JSON only for direct background AJAX (not Inertia page visits)
        if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'success' => true,
                'message' => 'Stage lead berhasil diubah.',
                'lead'    => $lead,
            ]);
        }

        return back()->with('message', 'Stage lead berhasil diubah.');
    }

    // ─── Destroy (Archive) ───────────────────────────────────────────────────────

    public function destroy(Lead $lead)
    {
        $lead->update(['is_archived' => true, 'updated_by' => Auth::id()]);

        return back()->with('message', 'Lead diarsipkan.');
    }

    // ─── Add Activity ────────────────────────────────────────────────────────────

    public function addActivity(Request $request, Lead $lead)
    {
        $data = $request->validate([
            'type'         => 'required|string|in:' . implode(',', LeadActivity::TYPES),
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'scheduled_at' => 'nullable|date',
        ]);

        $data['lead_id'] = $lead->id;
        $data['user_id'] = Auth::id();

        $activity = LeadActivity::create($data);

        // Always return JSON — axios calls from frontend don't send X-Inertia header
        return response()->json([
            'success'  => true,
            'message'  => 'Aktivitas berhasil ditambahkan.',
            'activity' => $activity->load('user:id,name'),
        ]);
    }

    // ─── Update Activity ─────────────────────────────────────────────────────────

    public function updateActivity(Request $request, Lead $lead, LeadActivity $activity): \Illuminate\Http\JsonResponse
    {
        if ($activity->user_id !== Auth::id() && !$this->isManagerOrAdmin()) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        $systemTypes = ['stage_change', 'deal_won', 'deal_lost', 'quotation_linked'];
        if (in_array($activity->type, $systemTypes)) {
            return response()->json(['message' => 'Aktivitas sistem tidak dapat diedit.'], 422);
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'metadata'    => 'nullable|array',
        ]);

        $activity->update($validated);
        return response()->json(['activity' => $activity->load('user:id,name')]);
    }

    // ─── Delete Activity ─────────────────────────────────────────────────────────

    public function destroyActivity(Request $request, Lead $lead, LeadActivity $activity): \Illuminate\Http\JsonResponse
    {
        // Only the owner or admin can delete
        if ($activity->user_id !== Auth::id() && !$this->isManagerOrAdmin()) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        // Prevent deleting system activities
        $systemTypes = ['stage_change', 'deal_won', 'deal_lost', 'quotation_linked'];
        if (in_array($activity->type, $systemTypes)) {
            return response()->json(['message' => 'Aktivitas sistem tidak dapat dihapus.'], 422);
        }

        $activity->delete();
        return response()->json(['message' => 'Aktivitas dihapus.']);
    }

    // ─── Pipeline Settings ───────────────────────────────────────────────────────

    public function updateSettings(Request $request)
    {
        if (!$this->isManagerOrAdmin()) {
            abort(403, 'Hanya manager atau administrator yang dapat mengubah pengaturan pipeline.');
        }

        $data = $request->validate([
            'featured_stage_1' => 'nullable|string',
            'featured_stage_2' => 'nullable|string',
            'stages'           => 'nullable|array',
        ]);

        $current = $this->getPipelineSettings();
        $merged = array_merge($current, array_filter($data, fn($v) => !is_null($v)));

        SystemSetting::updateOrCreate(
            ['key' => 'lead_pipeline_settings'],
            ['value' => $merged]
        );

        if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'success'  => true,
                'message'  => 'Pengaturan pipeline berhasil disimpan.',
                'settings' => $merged,
            ]);
        }

        return back()->with('message', 'Pengaturan pipeline berhasil disimpan.');
    }

    // ─── Visits Index ────────────────────────────────────────────────────────────

    public function indexVisits(Request $request)
    {
        $isManagerOrAdmin = $this->isManagerOrAdmin();

        $query = LeadVisit::with([
            'lead:id,title,lead_code',
            'user:id,name',
            'customer:id,name',
        ])->orderBy('scheduled_at');

        if (!$isManagerOrAdmin) {
            $query->where('user_id', Auth::id());
        }

        $visits = $query->get();

        $today    = now()->toDateString();
        $thisWeek = [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()];

        $stats = [
            'upcoming'  => $visits->filter(fn($v) => $v->scheduled_at->toDateString() > $today)->count(),
            'today'     => $visits->filter(fn($v) => $v->scheduled_at->toDateString() === $today)->count(),
            'thisWeek'  => $visits->filter(fn($v) => $v->scheduled_at->toDateString() >= $thisWeek[0] && $v->scheduled_at->toDateString() <= $thisWeek[1])->count(),
            'checkedIn' => $visits->whereNotNull('checked_in_at')->count(),
        ];

        $todayVisit = $visits->first(fn($v) => $v->scheduled_at->toDateString() === $today);

        return Inertia::render('LeadVisits', [
            'visits'           => $visits,
            'stats'            => $stats,
            'todayVisit'       => $todayVisit,
            'leads'            => Lead::active()->select('id', 'title', 'lead_code', 'customer_id', 'customer_name')->with('customer:id,name')->orderBy('title')->get(),
            'customers'        => Customer::select('id', 'name')->orderBy('name')->get(),
            'isManagerOrAdmin' => $isManagerOrAdmin,
        ]);
    }

    // ─── Store Visit ─────────────────────────────────────────────────────────────

    public function storeVisit(Request $request)
    {
        $data = $request->validate([
            'lead_id'      => 'nullable|uuid|exists:leads,id',
            'customer_id'  => 'nullable|string|exists:customers,id',
            'visit_type'   => 'required|string|in:visit,follow_up,demo,presentation,other',
            'subject'      => 'required|string|max:255',
            'location'     => 'nullable|string|max:255',
            'scheduled_at' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        $data['user_id'] = Auth::id();

        if (!empty($data['lead_id']) && empty($data['customer_id'])) {
            $ld = Lead::find($data['lead_id']);
            if ($ld && $ld->customer_id) {
                $data['customer_id'] = $ld->customer_id;
            }
        }

        $visit = LeadVisit::create($data);

        // Log on lead if linked
        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $this->logActivity($lead, 'visit', 'Kunjungan dijadwalkan: ' . $visit->subject, null, ['visit_id' => $visit->id]);
            }
        }

        return back()->with('message', 'Kunjungan berhasil dijadwalkan.');
    }

    // ─── Check In ────────────────────────────────────────────────────────────────

    public function checkIn(Request $request, LeadVisit $visit)
    {
        $data = $request->validate([
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        $visit->update([
            'checked_in_at'  => now(),
            'checked_in_lat' => $data['lat'] ?? null,
            'checked_in_lng' => $data['lng'] ?? null,
        ]);

        // Log on lead if linked
        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $this->logActivity($lead, 'visit', 'Check-in kunjungan: ' . $visit->subject);
            }
        }

        return back()->with('message', 'Check-in berhasil.');
    }
}

