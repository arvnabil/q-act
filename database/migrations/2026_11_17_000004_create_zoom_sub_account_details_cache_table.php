<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zoom_sub_account_details', function (Blueprint $table) {
            $table->id();
            $table->string('zoom_account_id', 80);
            $table->string('detail_type', 30);
            // Payload is encrypted by the model cast, including billing contact PII.
            $table->longText('payload');
            $table->timestamp('fetched_at');
            $table->timestamps();
            $table->unique(['zoom_account_id', 'detail_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zoom_sub_account_details');
    }
};
