<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // LONGTEXT is a MySQL/MariaDB type. Other drivers (e.g. SQLite used by
        // the test suite) store long text natively, so the ALTER is a no-op.
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

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
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

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
