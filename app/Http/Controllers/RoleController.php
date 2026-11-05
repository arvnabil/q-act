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
    'dashboard_view',
    'dashboard_view_bu',
    'dashboard_view_all',
    'sales_targets_edit',
    'leads_view',
    'leads_manage',
    'leads_visits',
    'calendar_view',
    'calendar_view_bu',
    'calendar_view_all',
    'quotations_view',
    'quotations_view_bu',
    'quotations_view_all',
    'quotations_create',
    'quotations_edit',
    'quotations_delete',
    'quotations_import_legacy',
    'sales_orders_view',
    'sales_orders_view_bu',
    'sales_orders_view_all',
    'sales_orders_edit',
    'sales_orders_delete',
    'sales_orders_delete_bulk',
    'customers_view',
    'customers_view_bu',
    'customers_view_all',
    'customers_create',
    'customers_edit',
    'customers_delete',
    'products_view',
    'products_create',
    'products_edit',
    'products_delete',
    'view_reports',
    'achievements_view',
    'manager_view',
    'user_management',
    'manage_business_units',
    'manage_settings',
    'manage_roles',
];

const STANDARD_ROLES = ['Administrator', 'Manager', 'Sales', 'Presales', 'Finance'];

const DEFAULT_ROLE_PERMISSIONS = [
    'Administrator' => SYSTEM_PERMISSIONS,
    'Manager' => [
        'dashboard', 'sales_targets_edit', 'calendar_view', 'calendar_view_all', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'sales_orders_edit', 'sales_orders_delete', 'sales_orders_delete_bulk', 'customers_view', 'customers_create', 'customers_edit',
        'products_view', 'view_reports', 'manager_view'
    ],
    'Sales' => [
        'dashboard', 'calendar_view', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'sales_orders_edit', 'customers_view', 'customers_create', 'customers_edit', 'products_view'
    ],
    'Presales' => [
        'dashboard', 'calendar_view', 'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete',
        'sales_orders_view', 'customers_view', 'products_view'
    ],
    'Finance' => [
        'dashboard', 'calendar_view', 'quotations_view', 'sales_orders_view', 'sales_orders_edit', 'view_reports', 'manager_view'
    ],
];

class RoleController extends Controller
{
    /**
     * Display role permissions matrix.
     */
    public function index(): Response
    {
        // Load roles with their permissions ordered by standard order
        $roles = Role::with(['permissions', 'users.businessUnit'])->get()->sortBy(function ($role) {
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
            'roleMembers' => $roles->mapWithKeys(fn ($role) => [$role->name => $role->users->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => (bool) $user->is_active,
                'business_unit' => $user->businessUnit?->name,
            ])->values()]),
        ]);
    }

    /**
     * Save role permissions matrix.
     * Expects: { rolePermissions: { RoleName: { perm_id: bool, ... }, ... } }
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'rolePermissions' => ['required', 'array', 'min:1'],
            'rolePermissions.*' => ['required', 'array'],
            'rolePermissions.*.*' => ['required', 'boolean'],
        ]);

        $roles = Role::where('guard_name', 'web')->whereIn('name', array_keys($data['rolePermissions']))->get()->keyBy('name');
        foreach ($data['rolePermissions'] as $roleName => $permissions) {
            if (!isset($roles[$roleName]) || array_diff(array_keys($permissions), SYSTEM_PERMISSIONS)) {
                throw \Illuminate\Validation\ValidationException::withMessages(['rolePermissions' => 'Role atau permission tidak valid.']);
            }
            foreach (['dashboard', 'calendar', 'quotations', 'sales_orders', 'customers'] as $module) {
                if (!empty($permissions[$module.'_view_all']) && !empty($permissions[$module.'_view_bu'])) {
                    $data['rolePermissions'][$roleName][$module.'_view_bu'] = false;
                }
            }
            if ($roleName === 'Administrator') {
                foreach (['user_management', 'manage_roles'] as $permission) {
                    if ($roles[$roleName]->permissions->contains('name', $permission)
                        && array_key_exists($permission, $permissions) && !$permissions[$permission]) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['rolePermissions' => 'Akses pengelolaan pengguna dan role Administrator harus tetap tersedia.']);
                    }
                }
            }
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($data, $roles) {
            foreach ($data['rolePermissions'] as $roleName => $permissions) {
                $role = $roles[$roleName];
                // Change only submitted permissions. Preserve unexposed/custom grants.
                $allowed = $role->permissions->pluck('name')->diff(array_keys($permissions));
                foreach ($permissions as $permission => $enabled) {
                    if ($enabled) {
                        Permission::findOrCreate($permission, 'web');
                        $allowed->push($permission);
                    }
                }
                $role->syncPermissions($allowed->unique()->values()->all());
            }
        });

        // Clear Spatie cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return back()->with('message', 'Hak akses berhasil disimpan!');
    }
}
