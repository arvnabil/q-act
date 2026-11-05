<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    public function up(): void
    {
        $perms = [
            'leads_view',
            'leads_view_bu',
            'leads_view_all',
            'leads_manage',
            'leads_manage_bu',
            'leads_manage_all',
            'leads_visits',
            'leads_visits_bu',
            'leads_visits_all',
        ];

        foreach ($perms as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // Administrator gets all
        $admin = Role::where('name', 'Administrator')->where('guard_name', 'web')->first();
        $admin?->givePermissionTo($perms);

        // Manager & Sales Manager get all scopes
        $managerPerms = [
            'leads_view', 'leads_view_all',
            'leads_manage', 'leads_manage_all',
            'leads_visits', 'leads_visits_all',
        ];
        $mgr = Role::where('name', 'Manager')->where('guard_name', 'web')->first();
        $mgr?->givePermissionTo($managerPerms);

        $sm = Role::where('name', 'Sales Manager')->where('guard_name', 'web')->first();
        $sm?->givePermissionTo($managerPerms);

        // Sales & Presales default to BU scope
        $salesPerms = [
            'leads_view', 'leads_view_bu',
            'leads_manage', 'leads_manage_bu',
            'leads_visits', 'leads_visits_bu',
        ];
        $sales = Role::where('name', 'Sales')->where('guard_name', 'web')->first();
        $sales?->givePermissionTo($salesPerms);

        $presales = Role::where('name', 'Presales')->where('guard_name', 'web')->first();
        $presales?->givePermissionTo($salesPerms);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $perms = [
            'leads_view_bu',
            'leads_view_all',
            'leads_manage_bu',
            'leads_manage_all',
            'leads_visits_bu',
            'leads_visits_all',
        ];

        Permission::whereIn('name', $perms)->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
