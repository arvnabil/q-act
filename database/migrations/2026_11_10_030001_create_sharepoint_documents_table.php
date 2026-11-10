<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sharepoint_documents', function (Blueprint $table) {
            $table->id();
            $table->string('source_type', 64);              // 'quotation_purchase_order', 'quotation', 'sales_order'
            $table->string('source_id', 64);                // UUID or string id of source entity
            $table->string('purchase_order_id', 64)->nullable();
            $table->string('quotation_id', 64)->nullable();
            $table->string('document_type', 64);            // 'customer_po', 'quotation_pdf', 'so_pdf'
            $table->string('original_filename');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('mime_type', 128)->nullable();
            $table->string('sharepoint_item_id')->nullable();
            $table->text('sharepoint_web_url')->nullable();
            $table->text('sharepoint_folder_path')->nullable();
            $table->string('status', 32)->default('pending'); // 'pending', 'uploading', 'synced', 'failed'
            $table->text('error_message')->nullable();
            $table->unsignedInteger('retry_count')->default(0);
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index(['source_type', 'source_id', 'document_type'], 'sp_docs_source_type_idx');
            $table->index('purchase_order_id');
            $table->index('quotation_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sharepoint_documents');
    }
};
