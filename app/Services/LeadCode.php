<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\DB;

class LeadCode
{
    public static function next(): string
    {
        return DB::transaction(function () {
            $prefix = 'L'.now()->format('ym').'.';
            $key = 'lead_sequence_'.now()->format('ym');
            SystemSetting::firstOrCreate(['key' => $key], ['value' => ['last' => 0]]);
            $counter = SystemSetting::where('key', $key)->lockForUpdate()->firstOrFail();
            $existing = Lead::where('lead_code', 'like', $prefix.'%')->pluck('lead_code')
                ->map(fn ($code) => (int) substr($code, strlen($prefix)))->max() ?? 0;
            $next = max($existing, (int) ($counter->value['last'] ?? 0)) + 1;
            $counter->update(['value' => ['last' => $next]]);

            return $prefix.str_pad($next, 3, '0', STR_PAD_LEFT);
        });
    }
}
