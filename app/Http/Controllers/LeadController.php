<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadPic;
use App\Models\LeadVisit;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\GoogleCalendarService;
use App\Services\ZoomService;
use App\Services\WorkflowAccess;
use App\Services\DocumentVisibility;
use App\Models\Quotation;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
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
            ['key' => 'lead_masuk',         'name' => 'Lead Masuk',         'type' => 'normal', 'color' => '#94A3B8'],
            ['key' => 'follow_up',          'name' => 'Follow Up',          'type' => 'normal', 'color' => '#3B82F6'],
            ['key' => 'lead_qualification', 'name' => 'Lead Qualification', 'type' => 'normal', 'color' => '#F59E0B'],
            ['key' => 'negotiation',        'name' => 'Negotiation',        'type' => 'normal', 'color' => '#009680'],
            ['key' => 'win',                'name' => 'Win',                'type' => 'deal',   'color' => '#8B5CF6'],
            ['key' => 'lost',               'name' => 'Lost',               'type' => 'lost',   'color' => '#10B981'],
            ['key' => 'selesai_terbayar',   'name' => 'Selesai (Terbayar)', 'type' => 'deal',   'color' => '#EF4444'],
        ];

        $setting = SystemSetting::find('lead_pipeline_settings');
        if (!$setting || empty($setting->value)) {
            return [
                'featured_stage_1' => 'negotiation',
                'featured_stage_2' => 'win',
                'stages'           => $defaultStages,
            ];
        }

        $val = $setting->value;
        $hasLegacySph = is_array($val) && isset($val['stages']) && collect($val['stages'])->contains('key', 'sph_terlayang');
        if ($hasLegacySph) {
            return [
                'featured_stage_1' => 'negotiation',
                'featured_stage_2' => 'win',
                'stages'           => $defaultStages,
            ];
        }

        return [
            'featured_stage_1' => $val['featured_stage_1'] ?? 'negotiation',
            'featured_stage_2' => $val['featured_stage_2'] ?? 'win',
            'stages'           => $val['stages'] ?? $defaultStages,
        ];
    }

    private function getAllowedStageKeys(): array
    {
        $pipelineSettings = $this->getPipelineSettings();
        $configuredKeys = array_column($pipelineSettings['stages'] ?? [], 'key');
        return array_values(array_unique($configuredKeys));
    }

    private function generateLeadCode(): string
    {
        return \App\Services\LeadCode::next();
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
            'title'       => mb_substr($title, 0, 255),
            'description' => $description,
            'metadata'    => $metadata ?: null,
        ]);
    }

    // ─── Leads Index ────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $isManagerOrAdmin = $this->isManagerOrAdmin();

        $query = WorkflowAccess::leads($request->user())->active()
            ->with(['sales:id,name', 'customer:id,name', 'quotation:id,status'])
            ->orderBy('sort_order')
            ->orderByDesc('created_at');

        $input = $request->validate([
            'search' => 'nullable|string|max:255',
            'stage' => 'nullable|string|max:100',
            'sales_id' => 'nullable|string|max:64',
        ]);
        $filters = collect(['search', 'stage', 'sales_id'])
            ->mapWithKeys(fn ($key) => [$key => trim($input[$key] ?? '')])->all();

        // Filters only narrow the permission-scoped query, including for BU members.
        if ($filters['stage'] !== '') {
            $query->where('stage', $filters['stage']);
        }
        if ($filters['sales_id'] !== '') {
            \App\Services\DashboardScope::owned($query, [$filters['sales_id']]);
        }
        if ($filters['search'] !== '') {
            $s = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', $s)
                    ->orWhere('customer_name', 'like', $s)
                    ->orWhere('customer_phone', 'like', $s)
                    ->orWhere('lead_code', 'like', $s)
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', $s));
            });
        }

        $filterSalesUsers = User::whereIn('id', WorkflowAccess::ids($request->user()))
            ->select('id', 'name')->orderBy('name')->get();

        $leads = $query->get();

        $pipelineSettings = $this->getPipelineSettings();
        $configuredStages = $pipelineSettings['stages'] ?? [];
        $configuredKeys = array_column($configuredStages, 'key');

        $allStageKeys = array_unique(array_merge(
            !empty($configuredKeys) ? $configuredKeys : Lead::STAGES,
            Lead::STAGES,
            $leads->pluck('stage')->filter()->all()
        ));

        // Group by stage for Kanban
        $grouped = [];
        foreach ($allStageKeys as $stage) {
            $grouped[$stage] = $leads->where('stage', $stage)->values();
        }

        // Deal stages dynamically derived from pipeline settings
        $dealStages = collect($configuredStages)->where('type', 'deal')->pluck('key')->all();
        if (empty($dealStages)) {
            $dealStages = ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai'];
        }

        // Stats
        $stats = [
            'total'           => $leads->count(),
            'byStage'         => $leads->groupBy('stage')->map->count(),
            'totalEstimated'  => $leads->sum('estimated_value'),
            'dealsWon'        => $leads->whereIn('stage', $dealStages)->count(),
        ];

        // Sales users available for lead assignment (manager only)
        $salesUsers = [];
        if ($isManagerOrAdmin) {
            $salesUsers = User::whereIn('id', WorkflowAccess::ids($request->user()))->whereIn('role', ['Sales', 'Presales', 'Sales Rep'])
                ->select('id', 'name')
                ->orderBy('name')
                ->get();
        }

        return Inertia::render('Leads', [
            'stageCounts'      => $isManagerOrAdmin ? Lead::query()->selectRaw('stage, COUNT(*) as total')->groupBy('stage')->pluck('total', 'stage') : [],
            'grouped'          => $grouped,
            'stats'            => $stats,
            'salesUsers'       => $salesUsers,
            'filters'          => $filters,
            'filterSalesUsers' => $filterSalesUsers,
            'isManagerOrAdmin' => $isManagerOrAdmin,
            'stages'           => Lead::STAGES,
            'sources'          => Lead::SOURCES,
            'customers'        => DocumentVisibility::apply(Customer::query(), $request->user(), 'customers')->select('id', 'name', 'address')->with('pics:id,customer_id,name,phone,email,is_primary')->orderBy('name')->get(),
            'pipelineSettings' => $this->getPipelineSettings(),
        ]);
    }

    // ─── Store ──────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
        $data = $request->validate([
            'customer_mode' => 'nullable|in:existing,new',
            'pic_mode' => 'nullable|in:existing,new',
            'pic_id' => 'nullable|integer',
            'title'           => 'required|string|max:255',
            'customer_id'     => 'required_if:customer_mode,existing|nullable|string|exists:customers,id',
            'customer_name'   => 'nullable|string|max:255',
            'customer_phone'  => 'nullable|string|max:50',
            'customer_email'  => 'nullable|email|max:100',
            'customer_address'=> 'nullable|string',
            'pic_name'        => 'nullable|string|max:255',
            'pic_phone'       => 'nullable|string|max:50',
            'sales_id'        => 'nullable|uuid|exists:users,id',
            'bu_id'           => 'nullable|uuid|exists:business_units,id',
            'stage'           => 'nullable|string|in:' . implode(',', $this->getAllowedStageKeys()),
            'source'          => 'nullable|string|max:100',
            'estimated_value' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
            'tags'            => 'nullable|array',
        ]);

        $data['created_by'] = Auth::id();
        $data['updated_by'] = Auth::id();
        $data['sales_id']   = $data['sales_id'] ?? Auth::id();
        $data['stage']      = $data['stage'] ?? 'lead_masuk';
        $data['lead_code']  = $this->generateLeadCode();

        DB::transaction(function () use ($request, $data) {
            $pic = \App\Services\LeadCustomerInput::prepare($request->user(), $data);
            $lead = Lead::create($data);
            \App\Services\LeadCustomerInput::attach($lead, $pic, $request->user());
            $this->logActivity($lead, 'note', 'Lead dibuat', 'Lead baru ditambahkan: ' . $lead->title);
        });

        return back()->with('message', 'Lead berhasil dibuat.');
    }

    // ─── Show ───────────────────────────────────────────────────────────────────

    public function show(Lead $lead)
    {
        WorkflowAccess::lead(request()->user(), $lead);
        $lead->load([
            'sales:id,name',
            'customer:id,name,address',
            'quotation:id,status,grand_total,revision_no',
            'quotations' => function ($q) {
                $q->select(['id', 'lead_id', 'status', 'grand_total', 'created_at', 'revision_no', 'relation_type', 'po_number', 'po_status', 'po_date'])
                  ->with('salesOrders:id,quotation_id,status,created_at')
                  ->latest();
            },
            'pics.customerPic',
            'visits.user:id,name',
        ]);

        // Load activities sorted newest first
        $lead->setRelation('activities',
            $lead->activities()->with(['user:id,name', 'visit'])->orderByDesc('created_at')->get()
        );

        $leadPics = $lead->pics()->select('id', 'name', 'email', 'position', 'phone')->get();
        $custPics = $lead->customer_id ? CustomerPic::where('customer_id', $lead->customer_id)->get() : collect();
        $customerPics = $leadPics->concat($custPics)->unique(fn($p) => mb_strtolower(trim($p->name)))->values();

        return Inertia::render('LeadDetail', [
            'lead'                     => $lead,
            'customerPics'             => $customerPics,
            'stages'                   => Lead::STAGES,
            'sources'                  => Lead::SOURCES,
            'pipelineSettings'         => $this->getPipelineSettings(),
            'googleCalendarConfigured' => (new GoogleCalendarService())->isConfigured(),
            'zoomConfigured'           => (new ZoomService())->isConfigured(),
            'userHasZoomLicense'       => (bool) (Auth::user()->has_zoom_license ?? false),
        ]);
    }

    // ─── Lead PICs ───────────────────────────────────────────────────────────────

    public function storePic(Request $request, Lead $lead)
    {
        $validated = $request->validate([
            'customer_pic_id' => 'nullable|exists:customer_pics,id',
            'name'            => 'required|string|max:255',
            'phone'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:100',
            'position'        => 'nullable|string|max:100',
            'role'            => 'required|string|in:primary,technical,purchasing,finance,other',
            'is_primary'      => 'nullable|boolean',
        ]);

        if (!empty($validated['is_primary'])) {
            $lead->pics()->update(['is_primary' => false]);
        }

        $validated['lead_id'] = $lead->id;
        $validated['created_by'] = Auth::id();

        LeadPic::create($validated);

        return back()->with('message', 'PIC berhasil ditambahkan ke lead.');
    }

    public function destroyPic(Lead $lead, LeadPic $pic)
    {
        if ($pic->lead_id === $lead->id) {
            $pic->delete();
        }
        return back()->with('message', 'PIC berhasil dihapus dari lead.');
    }

    // ─── Update ─────────────────────────────────────────────────────────────────

    public function update(Request $request, Lead $lead)
    {
        WorkflowAccess::lead($request->user(), $lead);
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
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
            'stage'       => 'required|string|in:' . implode(',', $this->getAllowedStageKeys()),
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

        $pipelineSettings = $this->getPipelineSettings();
        $stageConfig = collect($pipelineSettings['stages'] ?? [])->firstWhere('key', $newStage);
        $stageType = $stageConfig['type'] ?? (in_array($newStage, ['win', 'selesai_terbayar', 'proyek_deal', 'proyek_selesai']) ? 'deal' : (in_array($newStage, ['lost', 'no_deal']) ? 'lost' : 'normal'));

        if ($stageType === 'lost' && isset($data['lost_reason'])) {
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
        if ($stageType === 'deal' && !$lead->customer_id) {
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
        WorkflowAccess::lead($request->user(), $lead);
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
        $data = $request->validate([
            'type'         => 'required|string|in:' . implode(',', LeadActivity::TYPES),
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'scheduled_at' => 'nullable|date',
        ]);

        if (!empty($data['scheduled_at'])) $data['scheduled_at'] = Carbon::parse($data['scheduled_at'])->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
        $data['lead_id'] = $lead->id;
        $data['user_id'] = Auth::id();

        $activity = DB::transaction(function () use ($data, $lead) {
            $activity = LeadActivity::create($data);
            if (!empty($data['scheduled_at'])) {
                LeadVisit::create(['lead_id' => $lead->id, 'lead_activity_id' => $activity->id,
                    'user_id' => Auth::id(), 'customer_id' => $lead->customer_id,
                    'visit_type' => $data['type'] === 'meeting' ? 'other' : 'follow_up',
                    'subject' => mb_substr('Tindak lanjut: '.$data['title'], 0, 255), 'scheduled_at' => $data['scheduled_at'], 'notes' => $data['description'] ?? null]);
            }
            return $activity;
        });

        // Always return JSON — axios calls from frontend don't send X-Inertia header
        return response()->json([
            'success'  => true,
            'message'  => 'Aktivitas berhasil ditambahkan.',
            'activity' => $activity->load(['user:id,name', 'visit']),
        ]);
    }

    // ─── Update Activity ─────────────────────────────────────────────────────────

    public function updateActivity(Request $request, Lead $lead, LeadActivity $activity): \Illuminate\Http\JsonResponse
    {
        WorkflowAccess::lead($request->user(), $lead);
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
        abort_unless($activity->lead_id === $lead->id, 404);
        if ($activity->visit()->exists()) return response()->json(['message' => 'Gunakan panel agenda untuk jadwal ulang atau pembatalan. Riwayat progres tetap disimpan.'], 422);
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
        WorkflowAccess::lead($request->user(), $lead);
        abort_unless(WorkflowAccess::canManage($request->user()), 403);
        abort_unless($activity->lead_id === $lead->id, 404);
        if ($activity->visit()->exists()) return response()->json(['message' => 'Gunakan panel agenda untuk jadwal ulang atau pembatalan. Riwayat progres tetap disimpan.'], 422);
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
            'stages' => 'sometimes|required|array|min:1|max:50',
            'stages.*.key' => 'required|string|max:100|regex:/^[a-z][a-z0-9_]*$/|distinct',
            'stages.*.name' => 'required|string|max:100',
            'stages.*.color' => 'required|string|regex:/^#[0-9a-fA-F]{6}$/',
            'stages.*.type' => 'required|in:normal,deal,lost',
            'stage_moves' => 'sometimes|array',
            'stage_moves.*' => 'required|string|max:100',
            'original_stages' => 'sometimes|array',
        ]);

        $merged = DB::transaction(function () use ($data) {
            // Serialize settings changes before reading the current stage definitions.
            SystemSetting::firstOrCreate(['key' => 'lead_pipeline_settings'], ['value' => $this->getPipelineSettings()]);
            SystemSetting::where('key', 'lead_pipeline_settings')->lockForUpdate()->first();
            $current = $this->getPipelineSettings();
            if (isset($data['original_stages']) && $data['original_stages'] != $current['stages']) {
                throw \Illuminate\Validation\ValidationException::withMessages(['stages' => 'Tahap telah diubah pengguna lain. Tutup dan muat ulang halaman sebelum mengedit.']);
            }
            $merged = array_merge($current, array_filter(
                \Illuminate\Support\Arr::only($data, ['stages', 'featured_stage_1', 'featured_stage_2']), fn ($v) => !is_null($v)));
            $keys = array_column($merged['stages'], 'key');
            foreach (['featured_stage_1', 'featured_stage_2'] as $field) {
                if (!in_array($merged[$field], $keys, true)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([$field => 'Pilih tahap ringkasan yang masih tersedia.']);
                }
            }
            $removed = array_diff(array_column($current['stages'], 'key'), $keys);
            foreach ($removed as $from) {
                $leads = Lead::where('stage', $from)->lockForUpdate()->get(); // Includes archived leads.
                $to = $data['stage_moves'][$from] ?? null;
                if ($leads->isNotEmpty() && (!$to || !in_array($to, $keys, true))) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['stages' => 'Tahap '.$from.' masih berisi '.$leads->count().' lead. Pilih tahap tujuan yang masih tersedia.']);
                }
                foreach ($leads as $lead) {
                    $lead->update(['stage' => $to, 'updated_by' => Auth::id()]);
                    $this->logActivity($lead, 'stage_change', 'Tahap dipindahkan karena penghapusan tahap pipeline',
                        $from.' → '.$to, ['from' => $from, 'to' => $to, 'reason' => 'stage_removed']);
                }
            }
            SystemSetting::updateOrCreate(['key' => 'lead_pipeline_settings'], ['value' => $merged]);
            return $merged;
        });

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
        abort_unless(WorkflowAccess::canRead($request->user()) || WorkflowAccess::canSchedule($request->user()), 403);
        $isManagerOrAdmin = $this->isManagerOrAdmin();

        $query = LeadVisit::whereNull('cancelled_at')->whereIn('user_id', WorkflowAccess::ids($request->user()))->with([
            'lead:id,title,lead_code',
            'user:id,name',
            'customer:id,name',
        ])->orderBy('scheduled_at');



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

        $leadsForVisits = WorkflowAccess::leads($request->user())->active()->select('id', 'title', 'lead_code', 'customer_id', 'customer_name')->with('customer:id,name')->orderBy('title')->get();
        $customerIds    = $leadsForVisits->pluck('customer_id')->filter()->unique()->values()->all();
        return Inertia::render('LeadVisits', [
            'visits'                   => $visits,
            'stats'                    => $stats,
            'todayVisit'               => $todayVisit,
            'leads'                    => $leadsForVisits,
            'customers'                => DocumentVisibility::apply(Customer::query(), $request->user(), 'customers')->select('id', 'name')->orderBy('name')->get(),
            'customerPics'             => \App\Models\CustomerPic::whereIn('customer_id', $customerIds)->select('id', 'customer_id', 'name', 'email', 'position', 'phone')->get(),
            'isManagerOrAdmin'         => $isManagerOrAdmin,
            'googleCalendarConfigured' => (new GoogleCalendarService())->isConfigured(),
            'zoomConfigured'           => (new ZoomService())->isConfigured(),
            'userHasZoomLicense'       => (bool) (Auth::user()->has_zoom_license ?? false),
        ]);
    }

    // ─── Store Visit ─────────────────────────────────────────────────────────────

    public function storeVisit(Request $request)
    {
        abort_unless(WorkflowAccess::canSchedule($request->user()), 403);
        $data = $request->validate([
            'quotation_id' => 'nullable|string|exists:quotations,id',
            'lead_id'      => 'nullable|uuid|exists:leads,id',
            'customer_id'  => 'nullable|string|exists:customers,id',
            'visit_type'   => 'required|string|in:visit,follow_up,demo,presentation,installation,maintenance,leave,other',
            'subject'      => 'required|string|max:255',
            'location'     => 'nullable|string|max:255',
            'scheduled_at' => 'required|date',
            'end_at'       => 'nullable|date',
            'is_all_day'   => 'nullable|boolean',
            'notes'        => 'nullable|string',
            'create_zoom'   => 'nullable|boolean',
            'sync_calendar' => 'nullable|boolean',
            'attendee_emails'   => 'nullable|array',
            'attendee_emails.*' => 'email',
        ]);

        if (!empty($data['quotation_id'])) {
            $quotation = Quotation::findOrFail($data['quotation_id']);
            DocumentVisibility::authorize($request->user(), 'quotations', $quotation);
            $data['lead_id'] = $quotation->lead_id ?: $quotation->parentQuotation?->lead_id;
            $data['customer_id'] = $quotation->customer_id;
        }
        if (!empty($data['lead_id'])) {
            $contextLead = Lead::findOrFail($data['lead_id']);
            WorkflowAccess::lead($request->user(), $contextLead);
            $data['customer_id'] = $contextLead->customer_id;
        } elseif (!empty($data['customer_id']) && empty($data['quotation_id'])) {
            DocumentVisibility::authorize($request->user(), 'customers', Customer::findOrFail($data['customer_id']));
        }
        if (!empty($data['create_zoom']) && !$request->user()->has_zoom_license) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'create_zoom' => 'Akun Anda belum memiliki lisensi Zoom. Nonaktifkan opsi Zoom untuk menyimpan kunjungan biasa.',
            ]);
        }
        $data['user_id'] = Auth::id();
        $isAllDay = !empty($data['is_all_day']);
        $data['is_all_day'] = $isAllDay;

        if ($isAllDay) {
            $startCarbon = Carbon::parse($data['scheduled_at'])->setTimezone(config('app.timezone'))->startOfDay();
            $endCarbon = !empty($data['end_at'])
                ? Carbon::parse($data['end_at'])->setTimezone(config('app.timezone'))->endOfDay()
                : (clone $startCarbon)->endOfDay();
            if ($endCarbon->lt($startCarbon)) {
                $endCarbon = (clone $startCarbon)->endOfDay();
            }
            $data['scheduled_at'] = $startCarbon->format('Y-m-d H:i:s');
            $data['end_at']       = $endCarbon->format('Y-m-d H:i:s');
        } else {
            $startCarbon = Carbon::parse($data['scheduled_at'])->setTimezone(config('app.timezone'));
            $endCarbon = !empty($data['end_at'])
                ? Carbon::parse($data['end_at'])->setTimezone(config('app.timezone'))
                : (clone $startCarbon)->addHour();
            if ($endCarbon->lt($startCarbon)) {
                $endCarbon = (clone $startCarbon)->addHour();
            }
            $data['scheduled_at'] = $startCarbon->format('Y-m-d H:i:s');
            $data['end_at']       = $endCarbon->format('Y-m-d H:i:s');
        }

        if (!empty($data['lead_id']) && empty($data['customer_id'])) {
            $ld = Lead::find($data['lead_id']);
            if ($ld && $ld->customer_id) {
                $data['customer_id'] = $ld->customer_id;
            }
        }
        if (!empty($data['quotation_id']) && empty($data['customer_id'])) {
            $q = Quotation::find($data['quotation_id']);
            if ($q && $q->customer_id) {
                $data['customer_id'] = $q->customer_id;
            }
        }

        // Clean out extra form flags before creating model
        $createZoom      = !empty($data['create_zoom']);
        $syncCalendar    = $data['sync_calendar'] ?? false;
        $attendeeEmails  = array_filter($data['attendee_emails'] ?? []);
        unset($data['create_zoom'], $data['sync_calendar'], $data['attendee_emails']);

        $visit = DB::transaction(function () use ($data) {
            // Lock the owner to make double clicks/retries idempotent across both entry points.
            User::whereKey(Auth::id())->lockForUpdate()->firstOrFail();
            $existing = LeadVisit::where('user_id', Auth::id())->where('lead_id', $data['lead_id'] ?? null)
                ->where('quotation_id', $data['quotation_id'] ?? null)->where('subject', $data['subject'])
                ->where('scheduled_at', Carbon::parse($data['scheduled_at']))->whereNull('cancelled_at')->first();
            return $existing ?: LeadVisit::create($data);
        });
        if (!$visit->wasRecentlyCreated) return $request->wantsJson()
            ? response()->json(['visit' => $visit, 'warnings' => [], 'message' => 'Agenda tersebut sudah tersedia.'])
            : back()->with('message', 'Agenda tersebut sudah tersedia.');
        $warnings = [];

        // 1. Zoom Integration (if requested)
        if ($createZoom) {
            try {
                $zoomService = new ZoomService();
                if ($zoomService->isConfigured()) {
                    $hostEmail = Auth::user()->email;
                    $startTime = $startCarbon->toIso8601String();
                    $durationMinutes = max(15, min(1440, $startCarbon->diffInMinutes($endCarbon)));
                    $meeting = $zoomService->createMeeting($hostEmail, $visit->subject, $startTime, $durationMinutes, $visit->notes);
                    if ($meeting) {
                        $visit->update([
                            'zoom_meeting_id' => $meeting['id'],
                            'zoom_join_url'   => $meeting['join_url'],
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                \Log::warning('[LeadVisit] Auto Zoom creation skipped: ' . $e->getMessage());
            }
        }

        // 2. Google Calendar Integration (if requested/enabled)
        if ($syncCalendar) {
            try {
                $calendarService = new GoogleCalendarService();
                if ($calendarService->isConfigured()) {
                    if ($isAllDay) {
                        $gStart = $startCarbon->format('Y-m-d');
                        $gEnd   = (clone $endCarbon)->addDay()->format('Y-m-d');
                    } else {
                        $gStart = $startCarbon->toIso8601String();
                        $gEnd   = $endCarbon->toIso8601String();
                    }

                    $notes = trim($visit->notes ?? '');
                    $desc  = $visit->subject . "\n";
                    if ($visit->location) $desc .= "\nLokasi: " . $visit->location;
                    if ($notes) $desc .= "\n\n" . $notes;
                    if (!empty($attendeeEmails)) {
                        $desc .= "\n\nPeserta / Tamu:\n- " . implode("\n- ", $attendeeEmails);
                    }
                    $desc .= "\n\n---\nSales: " . Auth::user()->name;
                    if ($visit->lead_id) {
                        $ld = Lead::find($visit->lead_id);
                        if ($ld) $desc .= "\nLead: {$ld->lead_code} - {$ld->title}";
                    }
                    if ($visit->quotation_id) $desc .= "\nQuotation: " . url('/quotations/'.$visit->quotation_id);

                    $body = GoogleCalendarService::buildEventBody(
                        $visit->subject,
                        $desc,
                        $gStart,
                        $gEnd,
                        $visit->location,
                        $visit->zoom_join_url,
                        $isAllDay,
                        $attendeeEmails ?: null
                    );

                    $eventId = $calendarService->createEvent($body);
                    if ($eventId) {
                        $visit->update(['gc_event_id' => $eventId]);
                    }
                }
            } catch (\Throwable $e) {
                \Log::warning('[LeadVisit] Auto Google Calendar sync skipped: ' . $e->getMessage());
            }
        }

        if ($createZoom && !$visit->zoom_meeting_id) $warnings[] = 'Agenda tersimpan, tetapi tautan Zoom belum berhasil dibuat.';
        if ($syncCalendar && !$visit->gc_event_id) $warnings[] = 'Agenda tersimpan di kalender internal; sinkronisasi Google Calendar belum berhasil.';

        // Log on lead if linked
        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $details = ['visit_id' => $visit->id];
                if ($visit->zoom_join_url) $details['zoom_url'] = $visit->zoom_join_url;
                $this->logActivity($lead, 'visit', 'Kunjungan/Jadwal dibuat: ' . $visit->subject, null, $details);
            }
        }

        if ($request->wantsJson()) return response()->json(['visit' => $visit, 'warnings' => $warnings]);
        return back()->with('message', $warnings ? implode(' ', $warnings) : 'Agenda berhasil dijadwalkan.');
    }

    // ─── Update Visit ────────────────────────────────────────────────────────────

    public function updateVisit(Request $request, LeadVisit $visit)
    {
        WorkflowAccess::visit($request->user(), $visit);
        abort_if($visit->cancelled_at || $visit->checked_in_at, 422, 'Agenda sudah selesai/dibatalkan.');
        $data = $request->validate([
            'visit_type'   => 'required|string|in:visit,follow_up,demo,presentation,installation,maintenance,leave,other',
            'subject'      => 'required|string|max:255',
            'location'     => 'nullable|string|max:255',
            'scheduled_at' => 'required|date',
            'end_at'       => 'nullable|date',
            'is_all_day'   => 'nullable|boolean',
            'notes'        => 'nullable|string',
            'outcome'      => 'nullable|string',
        ]);

        $isAllDay = !empty($data['is_all_day']);
        $data['is_all_day'] = $isAllDay;

        if ($isAllDay) {
            $startCarbon = Carbon::parse($data['scheduled_at'])->setTimezone(config('app.timezone'))->startOfDay();
            $endCarbon = !empty($data['end_at'])
                ? Carbon::parse($data['end_at'])->setTimezone(config('app.timezone'))->endOfDay()
                : (clone $startCarbon)->endOfDay();
            if ($endCarbon->lt($startCarbon)) {
                $endCarbon = (clone $startCarbon)->endOfDay();
            }
            $data['scheduled_at'] = $startCarbon->format('Y-m-d H:i:s');
            $data['end_at']       = $endCarbon->format('Y-m-d H:i:s');
        } else {
            $startCarbon = Carbon::parse($data['scheduled_at'])->setTimezone(config('app.timezone'));
            $endCarbon = !empty($data['end_at'])
                ? Carbon::parse($data['end_at'])->setTimezone(config('app.timezone'))
                : (clone $startCarbon)->addHour();
            if ($endCarbon->lt($startCarbon)) {
                $endCarbon = (clone $startCarbon)->addHour();
            }
            $data['scheduled_at'] = $startCarbon->format('Y-m-d H:i:s');
            $data['end_at']       = $endCarbon->format('Y-m-d H:i:s');
        }
        $visit->update($data);
        if ($visit->lead_activity_id) LeadActivity::whereKey($visit->lead_activity_id)->update(['scheduled_at' => $visit->scheduled_at]);
        $warnings = [];
        if ($visit->zoom_meeting_id) {
            try {
                if (!app(ZoomService::class)->updateMeeting($visit->zoom_meeting_id, $visit->subject, $visit->scheduled_at->toIso8601String(), $visit->notes)) {
                    $warnings[] = 'Jadwal internal tersimpan; jadwal Zoom belum berhasil diperbarui.';
                } else { $warnings[] = 'Google Calendar belum terhubung; jadwal eksternal belum diperbarui.'; }
            } catch (\Throwable $e) { $warnings[] = 'Jadwal internal tersimpan; jadwal Zoom belum berhasil diperbarui.'; }
        }

        // Sync with Google Calendar if event exists
        if ($visit->gc_event_id) {
            try {
                $calendarService = app(GoogleCalendarService::class);
                if ($calendarService->isConfigured()) {
                    if ($visit->is_all_day) {
                        $gStart = Carbon::parse($visit->scheduled_at)->format('Y-m-d');
                        $gEnd   = Carbon::parse($visit->end_at ?: $visit->scheduled_at)->addDay()->format('Y-m-d');
                    } else {
                        $gStart = Carbon::parse($visit->scheduled_at)->toIso8601String();
                        $gEnd   = Carbon::parse($visit->end_at ?: $visit->scheduled_at)->toIso8601String();
                    }

                    $notes = trim($visit->notes ?? '');
                    $desc  = $visit->subject . "\n";
                    if ($visit->location) $desc .= "\nLokasi: " . $visit->location;
                    if ($notes) $desc .= "\n\n" . $notes;
                    if (!empty($attendeeEmails)) {
                        $desc .= "\n\nPeserta / Tamu:\n- " . implode("\n- ", $attendeeEmails);
                    }
                    $desc .= "\n\n---\nSales: " . Auth::user()->name;
                    if ($visit->lead_id) {
                        $ld = Lead::find($visit->lead_id);
                        if ($ld) $desc .= "\nLead: {$ld->lead_code} - {$ld->title}";
                    }
                    if ($visit->quotation_id) $desc .= "\nQuotation: " . url('/quotations/'.$visit->quotation_id);

                    $body = GoogleCalendarService::buildEventBody(
                        $visit->subject,
                        $desc,
                        $gStart,
                        $gEnd,
                        $visit->location,
                        $visit->zoom_join_url,
                        (bool) $visit->is_all_day
                    );

                    if (!$calendarService->updateEvent($visit->gc_event_id, $body)) $warnings[] = 'Jadwal Google Calendar belum berhasil diperbarui.';
                } else { $warnings[] = 'Google Calendar belum terhubung; jadwal eksternal belum diperbarui.'; }
            } catch (\Throwable $e) {
                $warnings[] = 'Jadwal Google Calendar belum berhasil diperbarui.';
                \Log::warning('[LeadVisit] Update Google Calendar sync skipped: ' . $e->getMessage());
            }
        }

        // Log on lead if linked
        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $this->logActivity($lead, 'visit', 'Perubahan jadwal kunjungan: ' . $visit->subject);
            }
        }

        if ($request->wantsJson()) return response()->json(['visit' => $visit, 'warnings' => $warnings]);
        return back()->with('message', $warnings ? implode(' ', $warnings) : 'Agenda berhasil diperbarui.');
    }

    // ─── Destroy Visit ───────────────────────────────────────────────────────────

    public function destroyVisit(LeadVisit $visit)
    {
        WorkflowAccess::visit(request()->user(), $visit);
        // 1. Remove from Google Calendar if linked
        if ($visit->gc_event_id) {
            try {
                $calendarService = new GoogleCalendarService();
                if ($calendarService->isConfigured()) {
                    $calendarService->deleteEvent($visit->gc_event_id);
                }
            } catch (\Throwable $e) {
                \Log::warning('[LeadVisit] Delete Google Calendar sync skipped: ' . $e->getMessage());
            }
        }

        // 2. Remove Zoom meeting if linked
        if ($visit->zoom_meeting_id) {
            try {
                $zoomService = new ZoomService();
                if ($zoomService->isConfigured()) {
                    $zoomService->deleteMeeting($visit->zoom_meeting_id);
                }
            } catch (\Throwable $e) {
                \Log::warning('[LeadVisit] Delete Zoom meeting skipped: ' . $e->getMessage());
            }
        }

        $leadId = $visit->lead_id;
        $subject = $visit->subject;

        $visit->delete();

        if ($leadId) {
            $lead = Lead::find($leadId);
            if ($lead) {
                $this->logActivity($lead, 'visit', 'Jadwal kunjungan dibatalkan: ' . $subject);
            }
        }

        return back()->with('message', 'Jadwal kunjungan berhasil dihapus.');
    }

    // ─── Instant Zoom Meeting for Visit ──────────────────────────────────────────

    public function createZoomForVisit(Request $request, LeadVisit $visit)
    {
        abort_if($visit->cancelled_at || $visit->checked_in_at, 422, 'Agenda sudah selesai/dibatalkan.');
        WorkflowAccess::visit($request->user(), $visit);
        $zoomService = new ZoomService();
        if (!$zoomService->isConfigured()) {
            return back()->withErrors(['zoom' => 'Integrasi Zoom belum dikonfigurasi oleh Administrator di menu Settings.']);
        }

        $hostEmail = Auth::user()->email;
        $startTime = Carbon::parse($visit->scheduled_at)->toIso8601String();
        $meeting = $zoomService->createMeeting($hostEmail, $visit->subject, $startTime, 60, $visit->notes);

        if (!$meeting || empty($meeting['join_url'])) {
            return back()->withErrors(['zoom' => 'Gagal membuat Zoom meeting. Pastikan akun email host terdaftar di akun Zoom organisasi Anda.']);
        }

        $visit->update([
            'zoom_meeting_id' => $meeting['id'],
            'zoom_join_url'   => $meeting['join_url'],
        ]);

        // If Google Calendar event exists, patch it with Zoom URL
        if ($visit->gc_event_id) {
            try {
                $calendarService = new GoogleCalendarService();
                if ($calendarService->isConfigured()) {
                    $startDt = Carbon::parse($visit->scheduled_at);
                    $endDt   = (clone $startDt)->addHour();
                    $desc    = ($visit->notes ?? '') . "\n\n🎥 Zoom: " . $meeting['join_url'];
                    $body    = GoogleCalendarService::buildEventBody(
                        $visit->subject,
                        $desc,
                        $startDt->toIso8601String(),
                        $endDt->toIso8601String(),
                        $visit->location,
                        $meeting['join_url']
                    );
                    $calendarService->updateEvent($visit->gc_event_id, $body);
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $this->logActivity($lead, 'meeting', 'Link Zoom Meeting dibuat untuk kunjungan: ' . $visit->subject, null, [
                    'zoom_url' => $meeting['join_url'],
                    'meeting_id' => $meeting['id']
                ]);
            }
        }

        return back()->with('message', 'Zoom meeting berhasil dibuat dan ditautkan ke kunjungan!');
    }

    // ─── Team Calendar View ──────────────────────────────────────────────────────

    public function indexCalendar(Request $request)
    {
        abort_unless(WorkflowAccess::canViewCalendar($request->user()), 403);
        $isManagerOrAdmin = $this->isManagerOrAdmin();
        $user = $request->user();

        $calendarScope = WorkflowAccess::calendarScope($user);
        $calendarUserIds = WorkflowAccess::calendarUserIds($user);

        $query = LeadVisit::whereNull('cancelled_at')->whereIn('user_id', $calendarUserIds)->with([
            'lead:id,title,lead_code',
            'user:id,name,avatar_initials,avatar_url',
            'customer:id,name',
        ])->orderBy('scheduled_at');

        if ($request->get('my_only', 'false') === 'true') {
            $query->where('user_id', Auth::id());
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('visit_type')) {
            $query->where('visit_type', $request->visit_type);
        }

        $visits = $query->get();

        $users = User::whereIn('id', $calendarUserIds)->select('id', 'name', 'avatar_initials', 'avatar_url')->orderBy('name')->get();
        $leads = WorkflowAccess::leads($user)->active()->select('id', 'title', 'lead_code', 'customer_id', 'customer_name')->orderBy('title')->get();
        $customers = DocumentVisibility::apply(Customer::query(), $user, 'customers')->select('id', 'name')->orderBy('name')->get();

        // Check configured status
        $googleCalendarConfigured = (new GoogleCalendarService())->isConfigured();
        $zoomConfigured           = (new ZoomService())->isConfigured();

        // Get BU user IDs for the current user
        $userBuIds = \App\Models\BusinessUnitMember::where('user_id', $user->id)->pluck('business_unit_id');
        $buUserIds = \App\Models\BusinessUnitMember::whereIn('business_unit_id', $userBuIds)->pluck('user_id')->unique()->values()->all();

        $calCustomerIds = $leads->pluck('customer_id')->filter()->unique()->values()->all();
        return Inertia::render('TeamCalendar', [
            'calendarScope'            => $calendarScope,
            'buUserIds'                => $buUserIds,
            'visits'                   => $visits,
            'users'                    => $users,
            'leads'                    => $leads,
            'customers'                => $customers,
            'customerPics'             => \App\Models\CustomerPic::whereIn('customer_id', $calCustomerIds)->select('id', 'customer_id', 'name', 'email', 'position', 'phone')->get(),
            'isManagerOrAdmin'         => $isManagerOrAdmin,
            'googleCalendarConfigured' => $googleCalendarConfigured,
            'zoomConfigured'           => $zoomConfigured,
            'userHasZoomLicense'       => (bool) (Auth::user()->has_zoom_license ?? false),
        ]);
    }

    // ─── Check In ────────────────────────────────────────────────────────────────

    public function checkIn(Request $request, LeadVisit $visit)
    {
        WorkflowAccess::visit($request->user(), $visit);
        abort_if($visit->cancelled_at, 422, 'Agenda dibatalkan.');
        // Keep the legacy timestamp so existing history and reports stay compatible.
        // Completion is allowed before or after the scheduled time; GPS is not required.
        if ($visit->checked_in_at) {
            return $request->wantsJson() ? response()->json(['visit' => $visit]) : back()->with('message', 'Agenda sudah selesai.');
        }
        $visit->update(['checked_in_at' => now()]);
        if ($visit->lead_activity_id) LeadActivity::whereKey($visit->lead_activity_id)->update(['completed_at' => $visit->checked_in_at]);

        // Log on lead if linked
        if ($visit->lead_id) {
            $lead = Lead::find($visit->lead_id);
            if ($lead) {
                $this->logActivity($lead, 'visit', 'Kunjungan selesai: ' . $visit->subject);
            }
        }

        if ($request->wantsJson()) return response()->json(['visit' => $visit]);
        return back()->with('message', 'Agenda ditandai selesai.');
    }

    // ─── Zoom Webhook Handler ────────────────────────────────────────────────────

    public function handleZoomWebhook(Request $request)
    {
        $event = $request->input('event');
        $payload = $request->input('payload');

        // 1. Zoom URL Validation Challenge
        if ($event === 'endpoint.url_validation') {
            $plainToken = $payload['plainToken'] ?? '';
            $secretSetting = SystemSetting::find('zoom_credentials')?->value ?? [];
            $secret = $secretSetting['webhook_secret_token'] ?? $secretSetting['client_secret'] ?? '';
            $encryptedToken = hash_hmac('sha256', $plainToken, $secret);

            return response()->json([
                'plainToken'     => $plainToken,
                'encryptedToken' => $encryptedToken,
            ]);
        }

        // 2. Meeting Ended Event
        if ($event === 'meeting.ended') {
            $meetingId = (string) ($payload['object']['id'] ?? '');
            if ($meetingId) {
                $visit = LeadVisit::where('zoom_meeting_id', $meetingId)->first();
                if ($visit && $visit->lead_id) {
                    $lead = Lead::find($visit->lead_id);
                    if ($lead) {
                        $duration = $payload['object']['duration'] ?? null;
                        $desc = 'Zoom Meeting selesai';
                        if ($duration) $desc .= " (Durasi: {$duration} menit)";
                        $this->logActivity($lead, 'meeting', $desc, null, ['meeting_id' => $meetingId]);
                    }
                }
            }
        }

        // 3. Cloud Recording Completed Event
        if ($event === 'recording.completed') {
            $meetingId = (string) ($payload['object']['id'] ?? '');
            $shareUrl  = $payload['object']['share_url'] ?? null;
            if ($meetingId && $shareUrl) {
                $visit = LeadVisit::where('zoom_meeting_id', $meetingId)->first();
                if ($visit) {
                    $visit->update(['zoom_recording_url' => $shareUrl]);
                    if ($visit->lead_id) {
                        $lead = Lead::find($visit->lead_id);
                        if ($lead) {
                            $this->logActivity($lead, 'meeting', 'Rekaman Zoom Meeting tersedia: ' . $shareUrl, null, [
                                'recording_url' => $shareUrl,
                                'meeting_id'    => $meetingId,
                            ]);
                        }
                    }
                }
            }
        }

        return response()->json(['status' => 'success']);
    }
}

