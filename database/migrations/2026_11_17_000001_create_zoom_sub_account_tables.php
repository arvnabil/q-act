<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zoom_sub_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('zoom_account_id', 80)->unique();
            $table->string('account_name')->nullable();
            $table->string('account_number', 40)->nullable()->index();
            $table->string('account_type', 80)->nullable();
            $table->string('owner_email')->nullable()->index();
            $table->unsignedInteger('seats')->nullable();
            $table->boolean('bulk_license')->default(false);
            $table->boolean('is_sub_reseller')->default(false);
            $table->dateTime('zoom_created_at')->nullable();
            $table->dateTime('subscription_start_time')->nullable();
            $table->dateTime('subscription_end_time')->nullable();
            $table->boolean('is_present')->default(true)->index();
            $table->dateTime('last_seen_at')->nullable();
            $table->unsignedBigInteger('last_sync_run_id')->nullable()->index();
            $table->string('customer_id', 15)->nullable()->index();
            $table->uuid('matched_by')->nullable();
            $table->timestamp('matched_at')->nullable();
            $table->timestamps();
        });

        Schema::create('zoom_sub_account_sync_runs', function (Blueprint $table) {
            $table->id();
            $table->uuid('triggered_by')->nullable()->index();
            $table->string('status', 20)->default('running')->index();
            $table->unsignedInteger('accounts_seen')->default(0);
            $table->unsignedInteger('accounts_added')->default(0);
            $table->unsignedInteger('accounts_updated')->default(0);
            $table->unsignedInteger('accounts_unchanged')->default(0);
            $table->unsignedInteger('pages_fetched')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        $permission = Permission::firstOrCreate([
            'name' => 'zoom_sub_accounts_access',
            'guard_name' => 'web',
        ]);

        foreach (['Administrator', 'Manager'] as $roleName) {
            Role::where('name', $roleName)
                ->where('guard_name', 'web')
                ->first()
                ?->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $permission = Permission::where('name', 'zoom_sub_accounts_access')
            ->where('guard_name', 'web')
            ->first();

        if ($permission) {
            foreach (['Administrator', 'Manager'] as $roleName) {
                Role::where('name', $roleName)
                    ->where('guard_name', 'web')
                    ->first()
                    ?->revokePermissionTo($permission);
            }
            $permission->delete();
        }

        Schema::dropIfExists('zoom_sub_account_sync_runs');
        Schema::dropIfExists('zoom_sub_accounts');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
