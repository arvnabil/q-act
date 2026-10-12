<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'dashboard', 'sales_targets_edit', 'quotations_view', 'quotations_create',
            'quotations_edit', 'quotations_delete', 'sales_orders_view', 'sales_orders_edit',
            'sales_orders_delete', 'sales_orders_delete_bulk', 'customers_view',
            'customers_create', 'customers_edit', 'customers_delete', 'products_view',
            'products_create', 'products_edit', 'products_delete', 'view_reports',
            'manager_view', 'user_management', 'manage_business_units', 'manage_settings',
            'manage_roles',
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::firstOrCreate([
                'name' => $permission, 'guard_name' => 'web',
            ]);
        }

        // 1. Create Roles
        $roles = [
            'Administrator',
            'Manager',
            'Sales Manager',
            'Sales',
            'Presales',
            'Finance'
        ];

        foreach ($roles as $role) {
            \Spatie\Permission\Models\Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $defaults = [
            'Administrator' => $permissions,
            'Manager' => array_diff($permissions, ['user_management', 'manage_roles']),
            'Sales Manager' => ['dashboard', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete', 'sales_orders_view', 'sales_orders_edit', 'customers_view', 'customers_create', 'customers_edit', 'products_view', 'view_reports', 'manager_view'],
            'Sales' => ['dashboard', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete', 'sales_orders_view', 'sales_orders_edit', 'customers_view', 'customers_create', 'customers_edit', 'products_view'],
            'Presales' => ['dashboard', 'quotations_view', 'quotations_create', 'quotations_edit', 'sales_orders_view', 'customers_view', 'products_view'],
            'Finance' => ['dashboard', 'quotations_view', 'sales_orders_view', 'sales_orders_edit', 'view_reports'],
        ];

        foreach ($defaults as $roleName => $rolePermissions) {
            \Spatie\Permission\Models\Role::findByName($roleName, 'web')->syncPermissions($rolePermissions);
        }

        // 2. Migrate existing users from the string `role` column to Spatie roles
        $users = \App\Models\User::all();
        foreach ($users as $user) {
            if (!empty($user->role)) {
                // Determine the correct role name based on existing string
                $roleName = $user->role;
                if ($roleName === 'admin') $roleName = 'Administrator';
                
                // Assign role if it exists
                if (\Spatie\Permission\Models\Role::where('name', $roleName)->exists()) {
                    $user->assignRole($roleName);
                }
            }
        }
    }
}
