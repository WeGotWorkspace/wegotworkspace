<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('app_update_history')) {
            $this->wgw()->create('app_update_history', function (Blueprint $table): void {
                $table->id();
                $table->string('from_version', 64);
                $table->string('to_version', 64);
                $table->string('status', 32);
                $table->text('message');
                $table->string('created_at', 32);
            });
        }

        if (! $this->wgwHasTable('api_refresh_tokens')) {
            $this->wgw()->create('api_refresh_tokens', function (Blueprint $table): void {
                $table->string('token_hash', 128)->primary();
                $table->string('username', 190);
                $table->string('role', 16);
                $table->unsignedBigInteger('expires_at');
                $table->boolean('revoked')->default(false);
                $table->unsignedBigInteger('created_at');
                $table->index('expires_at', 'idx_api_refresh_expires');
            });
        }

        if (! $this->wgwHasTable('api_revoked_tokens')) {
            $this->wgw()->create('api_revoked_tokens', function (Blueprint $table): void {
                $table->string('jti', 128)->primary();
                $table->unsignedBigInteger('expires_at');
                $table->unsignedBigInteger('created_at');
                $table->index('expires_at', 'idx_api_revoked_expires');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('api_revoked_tokens');
        $this->wgw()->dropIfExists('api_refresh_tokens');
        $this->wgw()->dropIfExists('app_update_history');
    }
};
