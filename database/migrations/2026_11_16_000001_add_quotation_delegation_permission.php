<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'quotations_delegate',
            'guard_name' => 'web',
        ]);

        foreach (['Administrator', 'Manager'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();
            $role?->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $permission = Permission::where('name', 'quotations_delegate')->where('guard_name', 'web')->first();

        if ($permission) {
            foreach (['Administrator', 'Manager'] as $roleName) {
                $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();
                $role?->revokePermissionTo($permission);
            }
            $permission->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
