<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('search_documents')) {
            $this->wgw()->create('search_documents', function (Blueprint $table): void {
                $table->id();
                $table->string('source_type', 24);
                $table->string('source_subtype', 64)->nullable();
                $table->string('source_key', 1024);
                $table->string('owner_username', 190)->nullable();
                $table->string('group_slug', 190)->nullable();
                $table->string('title', 512)->nullable();
                $table->string('extension', 32)->nullable();
                $table->string('category', 64)->nullable();
                $table->string('content_type', 255)->nullable();
                $table->unsignedBigInteger('size')->nullable();
                $table->unsignedBigInteger('created_at_ts')->nullable();
                $table->unsignedBigInteger('modified_at_ts')->nullable();
                $table->longText('body_text')->nullable();
                $table->longText('metadata_json')->nullable();
                $table->string('created_at', 32);
                $table->string('updated_at', 32);

                $table->unique(['source_type', 'source_key'], 'uniq_search_source');
                $table->index('owner_username', 'idx_search_owner');
                $table->index('group_slug', 'idx_search_group');
                $table->index(['source_type', 'modified_at_ts'], 'idx_search_type_mtime');
            });
        }

        if (! $this->wgwHasTable('search_terms')) {
            $this->wgw()->create('search_terms', function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('document_id');
                $table->string('token', 120);
                $table->string('field', 24)->default('body');
                $table->unsignedSmallInteger('weight')->default(1);
                $table->string('created_at', 32);
                $table->string('updated_at', 32);

                $table->foreign('document_id', 'fk_search_terms_document')
                    ->references('id')
                    ->on('search_documents')
                    ->cascadeOnDelete();
                $table->unique(['document_id', 'token', 'field'], 'uniq_search_term_doc_token_field');
                $table->index(['token', 'field'], 'idx_search_token_field');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('search_terms');
        $this->wgw()->dropIfExists('search_documents');
    }
};
