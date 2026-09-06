<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Users & Auth (Replacing Supabase Auth)
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sales_code')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('Sales');
            $table->string('mobile')->nullable();
            $table->string('avatar_initials')->nullable();
            $table->text('avatar_url')->nullable();
            $table->text('signature_url')->nullable();
            $table->bigInteger('target_sales')->default(0);
            $table->bigInteger('achieved_sales')->default(0);
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 2. Business Units
        Schema::create('business_units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('color')->nullable()->default('#6366f1');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('business_unit_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_unit_id')->constrained('business_units')->onDelete('cascade');
            $table->foreignUuid('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('role_in_bu')->default('member');
            $table->timestamp('joined_at')->useCurrent();
        });

        // 3. Customers & PICs
        Schema::create('customers', function (Blueprint $table) {
            $table->string('id', 15)->primary(); // e.g. C102938
            $table->string('name');
            $table->text('address')->nullable();
            $table->bigInteger('total_spend')->default(0);
            $table->foreignUuid('bu_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('customer_pics', function (Blueprint $table) {
            $table->id();
            $table->string('customer_id', 15);
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->foreignUuid('sales_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });

        // 4. Products & Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('color_hex')->default('#6B7280');
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->string('sku', 50)->primary();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->bigInteger('price')->default(0);
            $table->bigInteger('pricelist_distributor')->default(0);
            $table->decimal('diskon_distributor', 8, 2)->default(0);
            $table->bigInteger('modal')->default(0);
            $table->decimal('margin_sales', 8, 2)->default(0);
            $table->text('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 5. Settings & Config
        Schema::create('company_bank_accounts', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('bank_name');
            $table->string('account_number');
            $table->string('account_name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role')->unique();
            $table->json('permissions')->nullable();
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });

        // 6. Quotations
        Schema::create('quotations', function (Blueprint $table) {
            $table->string('id', 30)->primary(); // e.g. Q05.0826.036
            $table->string('customer_id', 15)->nullable();
            $table->foreignId('pic_id')->nullable()->constrained('customer_pics')->nullOnDelete();
            $table->foreignUuid('sales_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('bu_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->string('bank_account_id', 50)->nullable();
            $table->string('status')->default('draft');
            $table->date('date');
            $table->date('expired');
            $table->boolean('calc_tax')->default(true);
            $table->boolean('show_tax')->default(true);
            $table->decimal('ppn_rate', 5, 4)->default(0.11);
            $table->boolean('calc_pph')->default(false);
            $table->boolean('show_pph')->default(false);
            $table->decimal('pph_rate', 5, 4)->default(0.02);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->json('terms')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('bank_account_id')->references('id')->on('company_bank_accounts')->nullOnDelete();
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_id', 30);
            $table->string('sku', 50)->nullable();
            $table->integer('qty')->default(1);
            $table->bigInteger('hpp')->default(0);
            $table->bigInteger('price')->default(0);
            $table->decimal('margin', 8, 2)->default(0);
            $table->boolean('is_pph_applied')->default(false);
            $table->integer('sort_order')->default(0);

            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
            $table->foreign('sku')->references('sku')->on('products')->nullOnDelete();
        });

        Schema::create('quotation_sales_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('quotation_id', 30)->unique();
            $table->json('adjustments')->nullable();
            $table->timestamps();

            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
        });

        // 7. Sales Orders
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->string('id', 30)->primary(); // e.g. SO-2026-001
            $table->string('quotation_id', 30)->nullable();
            $table->string('customer_id', 15)->nullable();
            $table->foreignUuid('sales_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('bu_id')->nullable()->constrained('business_units')->nullOnDelete();
            $table->date('date');
            $table->string('po_number')->nullable();
            $table->date('po_date')->nullable();
            $table->string('status')->default('draft');
            $table->decimal('total_item_value', 15, 2)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('quotation_id')->references('id')->on('quotations')->nullOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });

        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('so_id', 30);
            $table->string('sku', 50)->nullable();
            $table->string('item_name')->nullable();
            $table->decimal('qty', 10, 2)->default(1);
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('hpp', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('so_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('sku')->references('sku')->on('products')->nullOnDelete();
        });

        Schema::create('sales_order_costs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('so_id', 30);
            $table->string('description');
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('so_id')->references('id')->on('sales_orders')->onDelete('cascade');
        });

        // 8. Logs & Notifications
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->string('entity_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('message');
            $table->string('link')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('sales_order_costs');
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('quotation_sales_notes');
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('company_bank_accounts');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('customer_pics');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('business_unit_members');
        Schema::dropIfExists('business_units');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
