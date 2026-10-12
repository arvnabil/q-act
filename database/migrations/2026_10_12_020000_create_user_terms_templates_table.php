<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_terms_templates')) {
            Schema::create('user_terms_templates', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('name');
                $table->json('terms');
                $table->timestamps();
            });
        }

        // Some MySQL hosting configurations limit indexes to 1000 bytes.
        // A prefix keeps the composite index valid for utf8mb4 while preserving
        // the full template name in the column.
        $indexExists = DB::selectOne(
            "SHOW INDEX FROM `user_terms_templates` WHERE Key_name = ?",
            ['user_terms_templates_user_id_name_index']
        );

        if (! $indexExists) {
            DB::statement(
                'ALTER TABLE `user_terms_templates` ADD INDEX `user_terms_templates_user_id_name_index` (`user_id`, `name`(150))'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_terms_templates');
    }
};
