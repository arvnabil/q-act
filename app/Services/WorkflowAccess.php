<?php

namespace App\Services;

use App\Models\BusinessUnitMember;
use App\Models\Lead;
use App\Models\LeadPic;
use App\Models\Quotation;
use App\Models\User;

class WorkflowAccess
{
    public static function ids(User $user)
    {
        if (DocumentVisibility::allows($user, 'leads_view_all')
            || DocumentVisibility::allows($user, 'leads_manage_all')
            || DocumentVisibility::allows($user, 'leads_visits_all')
            || DocumentVisibility::allows($user, 'quotations_view_all')) {
            return User::pluck('id');
        }
        $ids = collect([$user->id]);
        if (DocumentVisibility::allows($user, 'leads_view_bu')
            || DocumentVisibility::allows($user, 'leads_manage_bu')
            || DocumentVisibility::allows($user, 'leads_visits_bu')
            || DocumentVisibility::allows($user, 'quotations_view_bu')) {
            $bus = BusinessUnitMember::where('user_id', $user->id)->pluck('business_unit_id');
            $ids = $ids->merge(BusinessUnitMember::whereIn('business_unit_id', $bus)->pluck('user_id'));
        }

        return $ids->unique();
    }

    public static function canRead(User $user): bool
    {
        return DocumentVisibility::allows($user, 'leads_view') || DocumentVisibility::allows($user, 'quotations_view');
    }

    public static function canManage(User $user): bool
    {
        return DocumentVisibility::allows($user, 'leads_manage') || DocumentVisibility::allows($user, 'quotations_edit');
    }

    public static function canSchedule(User $user): bool
    {
        return DocumentVisibility::allows($user, 'leads_visits') || self::canManage($user);
    }

    public static function canViewCalendar(User $user): bool
    {
        return DocumentVisibility::allows($user, 'calendar_view')
            || self::canRead($user)
            || self::canSchedule($user);
    }

    public static function calendarScope(User $user): string
    {
        if (DocumentVisibility::allows($user, 'calendar_view_all')) {
            return 'all';
        }
        if (DocumentVisibility::allows($user, 'calendar_view_bu')) {
            return 'bu';
        }
        if (DocumentVisibility::allows($user, 'calendar_view')) {
            return 'own';
        }

        if (DocumentVisibility::allows($user, 'leads_view_all') || DocumentVisibility::allows($user, 'quotations_view_all')) {
            return 'all';
        }
        if (DocumentVisibility::allows($user, 'leads_view_bu') || DocumentVisibility::allows($user, 'quotations_view_bu')) {
            return 'bu';
        }

        return 'own';
    }

    public static function calendarUserIds(User $user)
    {
        $scope = self::calendarScope($user);
        if ($scope === 'all') {
            return User::pluck('id');
        }

        $ids = collect([$user->id]);
        if ($scope === 'bu') {
            $bus = BusinessUnitMember::where('user_id', $user->id)->pluck('business_unit_id');
            $ids = $ids->merge(BusinessUnitMember::whereIn('business_unit_id', $bus)->pluck('user_id'));
        }

        return $ids->unique();
    }

    public static function leads(User $user)
    {
        $q = Lead::query();
        if (! self::canRead($user)) {
            return $q->whereRaw('1=0');
        }

        return DashboardScope::owned($q, self::ids($user));
    }

    public static function lead(User $user, Lead $lead): void
    {
        abort_unless(self::leads($user)->whereKey($lead->id)->exists(), 404);
    }

    public static function fillFromQuotation(Lead $lead, Quotation $quotation, User $user): void
    {
        foreach (['customer_id' => $quotation->customer_id, 'customer_name' => $quotation->customer?->name,
            'customer_address' => $quotation->customer?->address, 'pic_name' => $quotation->pic?->name,
            'pic_phone' => $quotation->pic?->phone, 'customer_email' => $quotation->pic?->email] as $key => $value) {
            if (! $lead->$key && $value) {
                $lead->$key = $value;
            }
        }
        $lead->save();
        if ($quotation->pic) {
            LeadPic::firstOrCreate(
                ['lead_id' => $lead->id, 'customer_pic_id' => $quotation->pic_id],
                ['name' => $quotation->pic->name, 'phone' => $quotation->pic->phone, 'email' => $quotation->pic->email,
                    'role' => 'primary', 'is_primary' => ! $lead->pics()->exists(), 'created_by' => $user->id]);
        }
    }

    public static function visit(User $user, $visit): void
    {
        abort_unless(self::canSchedule($user) && self::ids($user)->contains($visit->user_id), 403);
        if ($visit->quotation_id) {
            DocumentVisibility::authorize($user, 'quotations', $visit->quotation);
        }
        if ($visit->lead_id) {
            self::lead($user, $visit->lead);
        }
    }
}
