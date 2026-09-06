<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\BusinessUnit;
use App\Models\BusinessUnitMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create a default Business Unit
        $bu = BusinessUnit::create([
            'id' => (string) Str::uuid(),
            'name' => 'HQ Jakarta',
            'code' => 'HQ-JKT',
            'color' => '#6366f1',
            'description' => 'Headquarters',
            'is_active' => true,
        ]);

        // 2. Create Permissions & Roles
        $adminRole = Role::firstOrCreate(['name' => 'Administrator', 'guard_name' => 'web']);
        $salesRole = Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'web']);

        $permissions = [
            'manage_users', 'manage_roles', 'manage_business_units',
            'manage_products', 'manage_customers', 'manage_quotations',
            'manage_sales_orders', 'view_dashboard', 'view_reports',
            'view_customers', 'view_products'
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $adminRole->syncPermissions(Permission::all());
        $salesRole->syncPermissions([
            'manage_quotations', 'view_customers', 'view_products', 'view_dashboard'
        ]);

        // 3. Create Admin User
        $admin = User::create([
            'id' => (string) Str::uuid(),
            'sales_code' => 'ADM-001',
            'name' => 'Super Admin',
            'email' => 'admin@activ.co.id',
            'password' => Hash::make('password123'),
            'role' => 'Administrator',
            'is_active' => true,
        ]);
        $admin->assignRole($adminRole);

        // 4. Assign Admin to BU
        BusinessUnitMember::create([
            'id' => (string) Str::uuid(),
            'business_unit_id' => $bu->id,
            'user_id' => $admin->id,
            'role_in_bu' => 'head',
        ]);
        
        // 5. Create a Sales User
        $sales = User::create([
            'id' => (string) Str::uuid(),
            'sales_code' => 'SLS-001',
            'name' => 'John Sales',
            'email' => 'sales@activ.co.id',
            'password' => Hash::make('password123'),
            'role' => 'Sales',
            'is_active' => true,
        ]);
        $sales->assignRole($salesRole);

        BusinessUnitMember::create([
            'id' => (string) Str::uuid(),
            'business_unit_id' => $bu->id,
            'user_id' => $sales->id,
            'role_in_bu' => 'member',
        ]);

        $this->command->info('Database seeded successfully with Admin (admin@activ.co.id / password123) and Sales (sales@activ.co.id / password123).');
    }
}
