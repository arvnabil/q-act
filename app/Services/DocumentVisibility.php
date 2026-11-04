<?php

namespace App\Services;

use App\Models\BusinessUnitMember;
use App\Models\User;

class DocumentVisibility
{
    // Explicit permissions: never infer access from a role name or Gate::before.
    public static function allows(User $user, string $permission): bool
    {
        return $user->getAllPermissions()->contains('name', $permission);
    }

    public static function apply($query, User $user, string $module)
    {
        if (!self::allows($user, $module.'_view')) {
            return $query->whereRaw('1 = 0');
        }
        if ($module === 'quotations') {
            $query->where('is_deleted', false)->whereNull('deleted_at');
        }
        if (self::allows($user, $module.'_view_all')) {
            return $query;
        }
        $buIds = self::allows($user, $module.'_view_bu')
            ? BusinessUnitMember::where('user_id', $user->id)->pluck('business_unit_id')
            : collect();
        $userIds = BusinessUnitMember::whereIn('business_unit_id', $buIds)->pluck('user_id')
            ->push($user->id)->unique()->values()->all();
        return $query->where(function ($q) use ($module, $userIds, $buIds) {
            if ($module === 'customers') {
                $q->whereIn('created_by', $userIds)
                    ->orWhereHas('pics', fn ($p) => $p->whereIn('sales_id', $userIds))
                    ->orWhereHas('quotations', fn ($p) => $p->where('is_deleted', false)->whereNull('deleted_at')
                        ->where(fn ($p) => $p->whereIn('sales_id', $userIds)->orWhereIn('created_by', $userIds)))
                    ->orWhereHas('salesOrders', fn ($p) => $p->whereIn('sales_id', $userIds));
            } else {
                $q->whereIn('sales_id', $userIds);
                if ($module === 'quotations') {
                    $q->orWhereIn('created_by', $userIds);
                }
            }
            if ($buIds->isNotEmpty()) {
                $q->orWhereIn('bu_id', $buIds);
            }
        });
    }

    public static function authorize(User $user, string $module, $model): void
    {
        abort_unless(self::apply($model->newQuery(), $user, $module)->whereKey($model->getKey())->exists(), 404);
    }
}
