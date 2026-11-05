<?php
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\{Permission, Role};
return new class extends Migration {
    public function up(): void {
        foreach (['dashboard_view', 'dashboard_view_bu', 'dashboard_view_all'] as $name) Permission::findOrCreate($name, 'web');
        // Preserve existing dashboard access; initial manager scope is configurable afterwards.
        foreach (Role::with('permissions')->get() as $role) {
            if ($role->permissions->contains('name', 'dashboard')) {
                $role->givePermissionTo('dashboard_view');
                if (in_array($role->name, ['Administrator', 'Manager', 'Sales Manager'])) $role->givePermissionTo('dashboard_view_all');
            }
        }
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
    public function down(): void {
        Permission::whereIn('name', ['dashboard_view', 'dashboard_view_bu', 'dashboard_view_all'])->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
