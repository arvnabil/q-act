<?php

namespace App\Http\Controllers;

use App\Models\CompanyBankAccount;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserTermsTemplate;
use App\Services\GoogleCalendarService;
use App\Services\ZoomService;
use App\Services\SharePointService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class SettingController extends Controller
{
    public function index(): Response
    {
        $companyInfoSetting = SystemSetting::find('company_info');
        $companyInfo = $companyInfoSetting ? $companyInfoSetting->value : [
            'name'    => 'PT ALFA CIPTA TEKNOLOGI VIRTUAL',
            'brand'   => 'ACTIV / ACCOMMERCE',
            'address' => 'Ruko Grand Puri Niaga, Jl. Puri Kencana Blok K6/3C, Kembangan, Jakarta Barat 11610',
            'branch'  => 'Jl. Raya Darmo Permai II No.56, Pradahkalikidal, Kec. Dukuhpakis, Surabaya, Jawa Timur 60226',
            'phone'   => '+62 21 5835 5508',
            'email'   => 'info@activ.co.id',
            'website' => 'www.activ.co.id',
        ];

        $masterTermsSetting = SystemSetting::find('master_terms_templates');
        $masterTerms = $masterTermsSetting ? $masterTermsSetting->value : [
            [
                'id'    => 'master_std_ppn11',
                'name'  => 'Standard Project (PPN 11%)',
                'terms' => [
                    'Harga belum termasuk PPN 11%',
                    'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
                    'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
                    'Garansi resmi distributor berlaku sesuai ketentuan produk',
                ]
            ],
            [
                'id'    => 'master_inc_ppn11',
                'name'  => 'Standard Project (Termasuk PPN 11%)',
                'terms' => [
                    'Harga sudah termasuk PPN 11%',
                    'Pembayaran CBO (Cash Before Delivery) atau sesuai persetujuan',
                    'Penawaran berlaku 14 hari sejak tanggal diterbitkan',
                    'Garansi resmi distributor berlaku sesuai ketentuan produk',
                ]
            ]
        ];

        $domainLogoMapSetting = SystemSetting::find('domain_logo_map');
        $domainLogoMap = $domainLogoMapSetting ? $domainLogoMapSetting->value : [];

        $maintenanceSetting = SystemSetting::find('maintenance_mode');
        $maintenanceMode = $maintenanceSetting ? $maintenanceSetting->value : [
            'enabled' => false,
            'domains' => [],
        ];

        $bankAccounts = CompanyBankAccount::orderByDesc('is_default')->get();

        // Integrations (Google Calendar & Zoom)
        $gcSetting = SystemSetting::find('google_calendar_credentials');
        $gcVal = $gcSetting ? $gcSetting->value : null;
        $googleCalendarSettings = [
            'is_configured' => (new GoogleCalendarService())->isConfigured(),
            'calendar_id'   => $gcVal['calendar_id'] ?? '',
            'client_email'  => $gcVal['client_email'] ?? '',
            'project_id'    => $gcVal['project_id'] ?? '',
            'has_private_key' => !empty($gcVal['private_key']),
        ];

        $zoomSetting = SystemSetting::find('zoom_credentials');
        $zoomVal = $zoomSetting ? $zoomSetting->value : null;
        $zoomSettings = [
            'is_configured' => (new ZoomService())->isConfigured(),
            'account_id'    => $zoomVal['account_id'] ?? '',
            'client_id'     => $zoomVal['client_id'] ?? '',
            'has_client_secret' => !empty($zoomVal['client_secret']),
        ];

        // SharePoint Storage Integration
        $spSetting = SystemSetting::find('sharepoint_integration');
        $spVal = $spSetting ? (array) $spSetting->value : [];
        $graphConfig = config('mail.mailers.microsoft-graph', []);
        $tenantId = $graphConfig['tenant_id'] ?? env('GRAPH_TENANT_ID');
        $clientId = $graphConfig['client_id'] ?? env('GRAPH_CLIENT_ID');
        $hasClientSecret = !empty($graphConfig['client_secret'] ?? env('GRAPH_CLIENT_SECRET'));

        $sharePointSettings = [
            'is_configured'               => (new SharePointService())->isConfigured(),
            'enabled'                     => (bool) ($spVal['enabled'] ?? false),
            'site_id'                     => $spVal['site_id'] ?? '',
            'drive_id'                    => $spVal['drive_id'] ?? '',
            'base_folder'                 => $spVal['base_folder'] ?? 'Documents/Purchase Orders',
            'last_sync_at'                => $spVal['last_sync_at'] ?? null,
            'last_sync_status'            => $spVal['last_sync_status'] ?? null,
            'last_sync_error'             => $spVal['last_sync_error'] ?? null,
            'notification_finance_email'  => $spVal['notification_finance_email'] ?? env('NOTIFICATION_FINANCE_EMAIL', 'finance@activ.co.id'),
            'notification_director_email' => $spVal['notification_director_email'] ?? env('NOTIFICATION_DIRECTOR_EMAIL', 'director@activ.co.id'),
            'graph_configured'            => !empty($tenantId) && !empty($clientId) && $hasClientSecret,
            'tenant_masked'               => $tenantId ? substr($tenantId, 0, 8) . '****' : '',
            'client_masked'               => $clientId ? substr($clientId, 0, 8) . '****' : '',
        ];
        $teamUsers = User::select('id', 'name', 'email', 'role', 'has_zoom_license', 'google_calendar_email')
            ->orderBy('name')
            ->get();

        return Inertia::render('Settings', [
            'companyInfo'            => $companyInfo,
            'bankAccounts'           => $bankAccounts,
            'masterTerms'            => $masterTerms,
            'domainLogoMap'          => $domainLogoMap,
            'maintenanceMode'        => $maintenanceMode,
            'googleCalendarSettings' => $googleCalendarSettings,
            'zoomSettings'           => $zoomSettings,
            'sharePointSettings'     => $sharePointSettings,
            'teamUsers'              => $teamUsers,
        ]);
    }

    public function updateCompanyInfo(Request $request)
    {
        $data = $request->validate([
            'name'    => 'nullable|string',
            'brand'   => 'nullable|string',
            'address' => 'nullable|string',
            'branch'  => 'nullable|string',
            'phone'   => 'nullable|string',
            'email'   => 'nullable|string',
            'website' => 'nullable|string',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'company_info'],
            ['value' => $data]
        );

        return back()->with('message', 'Informasi perusahaan berhasil diperbarui!');
    }

    public function storeBankAccount(Request $request)
    {
        $data = $request->validate([
            'bank_name'      => 'required|string',
            'account_number' => 'required|string',
            'account_name'   => 'required|string',
        ]);

        $count = CompanyBankAccount::count();

        CompanyBankAccount::create([
            'id'             => (string) Str::uuid(),
            'bank_name'      => trim($data['bank_name']),
            'account_number' => trim($data['account_number']),
            'account_name'   => trim($data['account_name']),
            'is_default'     => $count === 0,
        ]);

        return back()->with('message', 'Rekening bank berhasil ditambahkan!');
    }

    public function updateBankAccount(Request $request, string $id)
    {
        $data = $request->validate([
            'bank_name'      => 'required|string',
            'account_number' => 'required|string',
            'account_name'   => 'required|string',
        ]);

        $bank = CompanyBankAccount::findOrFail($id);
        $bank->update([
            'bank_name'      => trim($data['bank_name']),
            'account_number' => trim($data['account_number']),
            'account_name'   => trim($data['account_name']),
        ]);

        return back()->with('message', 'Rekening bank berhasil diperbarui!');
    }

    public function setDefaultBankAccount(string $id)
    {
        CompanyBankAccount::query()->update(['is_default' => false]);
        CompanyBankAccount::where('id', $id)->update(['is_default' => true]);

        return back()->with('message', 'Rekening default berhasil diubah!');
    }

    public function destroyBankAccount(string $id)
    {
        CompanyBankAccount::findOrFail($id)->delete();
        return back()->with('message', 'Rekening bank berhasil dihapus!');
    }

    public function updateMasterTerms(Request $request)
    {
        $data = $request->validate([
            'templates' => 'required|array',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'master_terms_templates'],
            ['value' => $data['templates']]
        );

        return back()->with('message', 'Master Template Syarat & Ketentuan berhasil diperbarui!');
    }

    public function storePersonalTermsTemplate(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'terms' => 'required|array|min:1',
            'terms.*' => 'required|string|max:2000',
        ]);

        $template = UserTermsTemplate::create([
            'user_id' => $request->user()->id,
            'name' => trim($data['name']),
            'terms' => array_values(array_filter(array_map('trim', $data['terms']))),
        ]);

        return response()->json(['template' => [
            'id' => $template->id,
            'name' => $template->name,
            'type' => 'personal',
            'terms' => $template->terms,
        ]]);
    }

    public function destroyPersonalTermsTemplate(Request $request, UserTermsTemplate $template)
    {
        abort_unless($template->user_id === $request->user()->id, 403);
        $template->delete();

        return response()->json(['success' => true]);
    }

    public function importLegacyPersonalTermsTemplates(Request $request)
    {
        $data = $request->validate([
            'templates' => 'required|array',
            'templates.*.name' => 'required|string|max:255',
            'templates.*.terms' => 'required|array|min:1',
            'templates.*.terms.*' => 'required|string|max:2000',
        ]);

        $imported = [];
        foreach ($data['templates'] as $legacy) {
            $template = UserTermsTemplate::firstOrCreate(
                ['user_id' => $request->user()->id, 'name' => trim($legacy['name'])],
                ['terms' => array_values(array_filter(array_map('trim', $legacy['terms'])))]
            );
            $imported[] = [
                'id' => $template->id,
                'name' => $template->name,
                'type' => 'personal',
                'terms' => $template->terms,
            ];
        }

        return response()->json(['templates' => $imported]);
    }

    public function updateDomainLogoMap(Request $request)
    {
        $data = $request->validate([
            'domainLogoMap' => 'required|array',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'domain_logo_map'],
            ['value' => $data['domainLogoMap']]
        );

        return back()->with('message', 'Pengaturan Logo Domain berhasil diperbarui!');
    }

    public function updateMaintenanceMode(Request $request)
    {
        $data = $request->validate([
            'enabled' => 'required|boolean',
            'domains' => 'nullable|array',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'maintenance_mode'],
            ['value' => [
                'enabled' => $data['enabled'],
                'domains' => $data['domains'] ?? [],
            ]]
        );

        return back()->with('message', 'Pengaturan mode perawatan berhasil diperbarui!');
    }

    // ─── Integrations (Google Calendar & Zoom) ───────────────────────────────────

    public function updateGoogleCalendar(Request $request)
    {
        $data = $request->validate([
            'action'        => 'required|in:save,clear,test',
            'calendar_id'   => 'nullable|string|max:255',
            'service_json'  => 'nullable|string', // Pasted service account JSON file
            'client_email'  => 'nullable|string|max:255',
            'private_key'   => 'nullable|string',
        ]);

        if ($data['action'] === 'clear') {
            SystemSetting::where('key', 'google_calendar_credentials')->delete();
            return back()->with('message', 'Kredensial Google Calendar berhasil dihapus.');
        }

        $existing = SystemSetting::find('google_calendar_credentials')?->value ?? [];

        // If user pasted raw JSON from Google Service Account file
        if (!empty($data['service_json'])) {
            $parsed = json_decode($data['service_json'], true);
            if (is_array($parsed) && !empty($parsed['client_email']) && !empty($parsed['private_key'])) {
                $existing['client_email'] = $parsed['client_email'];
                $existing['private_key']  = $parsed['private_key'];
                $existing['project_id']   = $parsed['project_id'] ?? '';
            } else {
                return back()->withErrors(['service_json' => 'Format JSON Service Account tidak valid. Pastikan file JSON resmi dari Google Cloud Console.']);
            }
        }

        if (!empty($data['calendar_id'])) {
            $existing['calendar_id'] = trim($data['calendar_id']);
        }
        if (!empty($data['client_email'])) {
            $existing['client_email'] = trim($data['client_email']);
        }
        if (!empty($data['private_key'])) {
            $existing['private_key'] = $data['private_key'];
        }

        SystemSetting::updateOrCreate(
            ['key' => 'google_calendar_credentials'],
            ['value' => $existing]
        );

        return back()->with('message', 'Pengaturan Google Calendar berhasil disimpan!');
    }

    public function updateZoom(Request $request)
    {
        $data = $request->validate([
            'action'        => 'required|in:save,clear,test',
            'account_id'    => 'nullable|string|max:255',
            'client_id'     => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:255',
        ]);

        if ($data['action'] === 'clear') {
            SystemSetting::where('key', 'zoom_credentials')->delete();
            return back()->with('message', 'Kredensial Zoom Server-to-Server berhasil dihapus.');
        }

        $existing = SystemSetting::find('zoom_credentials')?->value ?? [];

        if (!empty($data['account_id'])) {
            $existing['account_id'] = trim($data['account_id']);
        }
        if (!empty($data['client_id'])) {
            $existing['client_id'] = trim($data['client_id']);
        }
        if (!empty($data['client_secret'])) {
            $existing['client_secret'] = trim($data['client_secret']);
        }

        SystemSetting::updateOrCreate(
            ['key' => 'zoom_credentials'],
            ['value' => $existing]
        );

        return back()->with('message', 'Pengaturan Zoom Server-to-Server berhasil disimpan!');
    }

    public function updateUserIntegrations(Request $request, User $user)
    {
        $data = $request->validate([
            'has_zoom_license'      => 'nullable|boolean',
            'google_calendar_email' => 'nullable|email|max:255',
        ]);

        $user->update([
            'has_zoom_license'      => $data['has_zoom_license'] ?? $user->has_zoom_license,
            'google_calendar_email' => $data['google_calendar_email'] ?? $user->google_calendar_email,
        ]);

        return back()->with('message', "Pengaturan integrasi user {$user->name} berhasil diperbarui!");
    }

    public function updateSharePoint(Request $request)
    {
        $data = $request->validate([
            'enabled'                     => 'required|boolean',
            'site_id'                     => 'nullable|string|max:500',
            'drive_id'                    => 'nullable|string|max:500',
            'base_folder'                 => 'nullable|string|max:255',
            'notification_finance_email'  => 'nullable|email|max:255',
            'notification_director_email' => 'nullable|email|max:255',
        ]);

        $existing = SystemSetting::find('sharepoint_integration')?->value ?? [];

        $existing['enabled'] = (bool) $data['enabled'];
        $existing['site_id'] = trim($data['site_id'] ?? '');
        $existing['drive_id'] = trim($data['drive_id'] ?? '');
        $existing['base_folder'] = trim($data['base_folder'] ?? 'Documents/Purchase Orders', '/');
        $existing['notification_finance_email'] = trim($data['notification_finance_email'] ?? '');
        $existing['notification_director_email'] = trim($data['notification_director_email'] ?? '');

        SystemSetting::updateOrCreate(
            ['key' => 'sharepoint_integration'],
            ['value' => $existing]
        );

        return back()->with('message', 'Pengaturan Microsoft 365 SharePoint berhasil disimpan!');
    }

    public function testSharePointConnection(Request $request, SharePointService $sharePoint)
    {
        $action = $request->input('action', 'connection');

        if ($action === 'upload') {
            $result = $sharePoint->testUpload();
        } else {
            $result = $sharePoint->testConnection();
        }

        $existing = SystemSetting::find('sharepoint_integration')?->value ?? [];
        $existing['last_sync_at'] = now()->toISOString();
        $existing['last_sync_status'] = $result['success'] ? 'success' : 'failed';
        $existing['last_sync_error'] = $result['success'] ? null : ($result['message'] ?? 'Error testing connection');

        SystemSetting::updateOrCreate(
            ['key' => 'sharepoint_integration'],
            ['value' => $existing]
        );

        if ($result['success']) {
            return back()->with('message', $result['message']);
        }

        return back()->withErrors(['sharepoint_test' => $result['message']]);
    }
}