<?php

namespace App\Http\Controllers;

use App\Models\CompanyBankAccount;
use App\Models\SystemSetting;
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

        return Inertia::render('Settings', [
            'companyInfo'   => $companyInfo,
            'bankAccounts'  => $bankAccounts,
            'masterTerms'   => $masterTerms,
            'domainLogoMap' => $domainLogoMap,
            'maintenanceMode' => $maintenanceMode,
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
}
