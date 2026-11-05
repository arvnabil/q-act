<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    public function up(): void
    {
        $perms = ['calendar_view', 'calendar_view_bu', 'calendar_view_all'];
        foreach ($perms as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // Grant to roles
        $admin = Role::where('name', 'Administrator')->where('guard_name', 'web')->first();
        $admin?->givePermissionTo(['calendar_view', 'calendar_view_all']);

        $mgr = Role::where('name', 'Manager')->where('guard_name', 'web')->first();
        $mgr?->givePermissionTo(['calendar_view', 'calendar_view_all']);

        $sm = Role::where('name', 'Sales Manager')->where('guard_name', 'web')->first();
        $sm?->givePermissionTo(['calendar_view', 'calendar_view_all']);

        $sales = Role::where('name', 'Sales')->where('guard_name', 'web')->first();
        $sales?->givePermissionTo(['calendar_view']);

        $presales = Role::where('name', 'Presales')->where('guard_name', 'web')->first();
        $presales?->givePermissionTo(['calendar_view']);

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::whereIn('name', ['calendar_view', 'calendar_view_bu', 'calendar_view_all'])->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};

