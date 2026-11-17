<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private array $permissions = [
        'zoom_sub_accounts_sync',
        'zoom_sub_accounts_match',
    ];

    public function up(): void
    {
        foreach ($this->permissions as $name) {
            $permission = Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);

            foreach (['Administrator', 'Manager'] as $roleName) {
                Role::where('name', $roleName)
                    ->where('guard_name', 'web')
                    ->first()
                    ?->givePermissionTo($permission);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        foreach ($this->permissions as $name) {
            $permission = Permission::where('name', $name)
                ->where('guard_name', 'web')
                ->first();

            if (! $permission) {
                continue;
            }

            foreach (['Administrator', 'Manager'] as $roleName) {
                Role::where('name', $roleName)
                    ->where('guard_name', 'web')
                    ->first()
                    ?->revokePermissionTo($permission);
            }

            $permission->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
