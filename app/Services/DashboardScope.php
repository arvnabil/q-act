<?php
namespace App\Services;

use App\Models\{User, BusinessUnitMember};

class DashboardScope
{
    public static function users(User $user)
    {
        if (DocumentVisibility::allows($user, 'dashboard_view_all')) return User::query();
        $ids = collect([$user->id]);
        if (DocumentVisibility::allows($user, 'dashboard_view_bu')) {
            $bus = BusinessUnitMember::where('user_id', $user->id)->pluck('business_unit_id');
            $ids = $ids->merge(BusinessUnitMember::whereIn('business_unit_id', $bus)->pluck('user_id'));
        }
        return User::whereIn('id', $ids->unique());
    }

    public static function owned($query, $ids)
    {
        return $query->where(fn ($q) => $q->whereIn('sales_id', $ids)
            ->orWhere(fn ($q) => $q->whereNull('sales_id')->whereIn('created_by', $ids)));
    }
}
