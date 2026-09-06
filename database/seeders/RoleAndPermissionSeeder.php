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
