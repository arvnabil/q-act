<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $newStages = [
            ['key' => 'lead_masuk',         'name' => 'Lead Masuk',         'type' => 'normal', 'color' => '#94A3B8'],
            ['key' => 'follow_up',          'name' => 'Follow Up',          'type' => 'normal', 'color' => '#3B82F6'],
            ['key' => 'lead_qualification', 'name' => 'Lead Qualification', 'type' => 'normal', 'color' => '#F59E0B'],
            ['key' => 'negotiation',        'name' => 'Negotiation',        'type' => 'normal', 'color' => '#009680'],
            ['key' => 'win',                'name' => 'Win',                'type' => 'deal',   'color' => '#8B5CF6'],
            ['key' => 'lost',               'name' => 'Lost',               'type' => 'lost',   'color' => '#10B981'],
            ['key' => 'selesai_terbayar',   'name' => 'Selesai (Terbayar)', 'type' => 'deal',   'color' => '#EF4444'],
        ];

        // 1. Update lead_pipeline_settings if it exists
        $setting = DB::table('system_settings')->where('key', 'lead_pipeline_settings')->first();
        if ($setting) {
            $val = json_decode($setting->value, true);
            if (is_array($val)) {
                $hasLegacy = isset($val['stages']) && collect($val['stages'])->contains('key', 'sph_terlayang');
                if ($hasLegacy) {
                    $val['stages'] = $newStages;
                    $val['featured_stage_1'] = 'negotiation';
                    $val['featured_stage_2'] = 'win';
                    DB::table('system_settings')->where('key', 'lead_pipeline_settings')->update([
                        'value' => json_encode($val),
                    ]);
                }
            }
        }

        // 2. Migrate existing lead rows
        $map = [
            'data_masuk'      => 'lead_masuk',
            'sph_terlayang'   => 'follow_up',
            'hot_progress'    => 'lead_qualification',
            'proyek_deal'     => 'negotiation',
            'proyek_berjalan' => 'win',
            'no_deal'         => 'lost',
            'proyek_selesai'  => 'selesai_terbayar',
        ];

        foreach ($map as $old => $new) {
            DB::table('leads')->where('stage', $old)->update(['stage' => $new]);
        }
    }

    public function down(): void
    {
        $map = [
            'lead_masuk'         => 'data_masuk',
            'follow_up'          => 'sph_terlayang',
            'lead_qualification' => 'hot_progress',
            'negotiation'        => 'proyek_deal',
            'win'                => 'proyek_berjalan',
            'lost'               => 'no_deal',
            'selesai_terbayar'   => 'proyek_selesai',
        ];

        foreach ($map as $new => $old) {
            DB::table('leads')->where('stage', $new)->update(['stage' => $old]);
        }
    }
};

