<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

// All features/permissions available in the system
// These are seeded once and then toggled per-role.
const SYSTEM_PERMISSIONS = [
    'dashboard',
    'sales_targets_edit',
    'quotations_view',
    'quotations_create',
    'quotations_edit',
    'quotations_delete',
    'sales_orders_view',
    'sales_orders_edit',
    'sales_orders_delete',
    'sales_orders_delete_bulk',
    'customers_view',
    'customers_create',
    'customers_edit',
    'customers_delete',
    'products_view',
    'products_create',
    'products_edit',
    'products_delete',
    'view_reports',
    'manager_view',
    'user_management',
];

const STANDARD_ROLES = ['Administrator', 'Manager', 'Sales', 'Presales', 'Finance'];

const DEFAULT_ROLE_PERMISSIONS = [
    'Administrator' => SYSTEM_PERMISSIONS,
    'Manager' => [
        'dashboard', 'sales_targets_edit', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'sales_orders_edit', 'sales_orders_delete', 'sales_orders_delete_bulk', 'customers_view', 'customers_create', 'customers_edit',
        'products_view', 'view_reports', 'manager_view'
    ],
    'Sales' => [
        'dashboard', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'sales_orders_edit', 'customers_view', 'customers_create', 'customers_edit', 'products_view'
    ],
    'Presales' => [
        'dashboard', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'customers_view', 'products_view'
    ],
    'Finance' => [
        'dashboard', 'quotations_view', 'sales_orders_view', 'sales_orders_edit', 'view_reports', 'manager_view'
    ],
];

class RoleController extends Controller
{
    /**
     * Display role permissions matrix.
     */
    public function index(): Response
    {
        // Ensure all permissions exist in DB
        foreach (SYSTEM_PERMISSIONS as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // Ensure default roles exist in DB and have default permissions if empty or incomplete
        foreach (STANDARD_ROLES as $roleName) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            if (($role->permissions()->count() < count(DEFAULT_ROLE_PERMISSIONS[$roleName])) && isset(DEFAULT_ROLE_PERMISSIONS[$roleName])) {
                $role->syncPermissions(DEFAULT_ROLE_PERMISSIONS[$roleName]);
            }
        }

        // Load roles with their permissions ordered by standard order
        $roles = Role::with('permissions')->get()->sortBy(function ($role) {
            $idx = array_search($role->name, STANDARD_ROLES);
            return $idx !== false ? $idx : 999;
        })->values();

        $rolePermissions = [];

        foreach ($roles as $role) {
            $perms = [];
            foreach (SYSTEM_PERMISSIONS as $perm) {
                $perms[$perm] = $role->permissions->contains('name', $perm);
            }
            $rolePermissions[$role->name] = $perms;
        }

        return Inertia::render('Roles', [
            'rolePermissions' => $rolePermissions,
            'rolesList'       => $roles->pluck('name')->values(),
            'features'        => SYSTEM_PERMISSIONS,
        ]);
    }

    /**
     * Save role permissions matrix.
     * Expects: { rolePermissions: { RoleName: { perm_id: bool, ... }, ... } }
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'rolePermissions' => ['required', 'array'],
        ]);

        foreach ($data['rolePermissions'] as $roleName => $permissions) {
            $role = Role::findByName($roleName, 'web');
            if (!$role) continue;

            // Collect permission names that are true
            $allowed = collect($permissions)
                ->filter(fn($val) => $val === true)
                ->keys()
                ->toArray();

            // Sync permissions on the role
            $role->syncPermissions($allowed);
        }

        // Clear Spatie cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return back()->with('message', 'Hak akses berhasil disimpan!');
    }
}
