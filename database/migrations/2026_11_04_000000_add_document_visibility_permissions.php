<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration {
    public function up(): void
    {
        foreach (['quotations', 'sales_orders', 'customers'] as $module) {
            foreach (['bu', 'all'] as $scope) {
                Permission::findOrCreate($module.'_view_'.$scope, 'web');
            }
        }
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
    public function down(): void
    {
        Permission::whereIn('name', [
            'quotations_view_bu', 'quotations_view_all', 'sales_orders_view_bu',
            'sales_orders_view_all', 'customers_view_bu', 'customers_view_all',
        ])->delete();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
