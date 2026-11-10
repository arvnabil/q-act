<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    public function up(): void
    {
        $permissions = [
            'sharepoint_view',
            'sharepoint_upload',
            'sharepoint_settings',
        ];

        foreach ($permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // Assign to Administrator / admin
        $adminRoles = Role::where('guard_name', 'web')->whereIn('name', ['Administrator', 'admin'])->get();
        foreach ($adminRoles as $role) {
            $role->givePermissionTo($permissions);
        }

        // Assign to Manager
        $managerRole = Role::where('guard_name', 'web')->where('name', 'Manager')->first();
        if ($managerRole) {
            $managerRole->givePermissionTo(['sharepoint_view', 'sharepoint_upload']);
        }

        // Assign sharepoint_view to Sales Manager, Sales, Presales, Finance
        $viewerRoles = Role::where('guard_name', 'web')->whereIn('name', [
            'Sales Manager', 'Sales', 'Presales', 'Finance'
        ])->get();
        foreach ($viewerRoles as $role) {
            $role->givePermissionTo('sharepoint_view');
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::whereIn('name', [
            'sharepoint_view',
            'sharepoint_upload',
            'sharepoint_settings',
        ])->delete();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
