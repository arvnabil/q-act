<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('quotation_items', 'image_url')) {
            DB::statement('ALTER TABLE quotation_items MODIFY image_url LONGTEXT NULL');
        }
        if (Schema::hasColumn('products', 'image_url')) {
            DB::statement('ALTER TABLE products MODIFY image_url LONGTEXT NULL');
        }
        if (Schema::hasColumn('users', 'avatar_url')) {
            DB::statement('ALTER TABLE users MODIFY avatar_url LONGTEXT NULL');
        }
        if (Schema::hasColumn('users', 'signature_url')) {
            DB::statement('ALTER TABLE users MODIFY signature_url LONGTEXT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('quotation_items', 'image_url')) {
            DB::statement('ALTER TABLE quotation_items MODIFY image_url TEXT NULL');
        }
        if (Schema::hasColumn('products', 'image_url')) {
            DB::statement('ALTER TABLE products MODIFY image_url TEXT NULL');
        }
        if (Schema::hasColumn('users', 'avatar_url')) {
            DB::statement('ALTER TABLE users MODIFY avatar_url TEXT NULL');
        }
        if (Schema::hasColumn('users', 'signature_url')) {
            DB::statement('ALTER TABLE users MODIFY signature_url TEXT NULL');
        }
    }
};
