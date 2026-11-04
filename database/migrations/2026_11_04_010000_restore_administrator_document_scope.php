<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    public function up(): void
    {
        foreach (['quotations', 'sales_orders', 'customers'] as $module) {
            $view = Permission::findOrCreate($module.'_view', 'web');
            $all = Permission::findOrCreate($module.'_view_all', 'web');
            foreach (Role::where('guard_name', 'web')->whereIn('name', ['Administrator', 'admin'])->get() as $role) {
                $role->givePermissionTo([$view, $all]);
            }
        }
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Preserve permissions subsequently edited by administrators.
    }
};
