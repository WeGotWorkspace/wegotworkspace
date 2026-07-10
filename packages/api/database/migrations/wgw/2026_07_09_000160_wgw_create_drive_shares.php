<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if ($this->wgwHasTable('drive_shares')) {
            return;
        }

        $this->wgw()->create('drive_shares', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            // 512 keeps path index under MySQL utf8mb4 index limit (3072 bytes).
            $table->string('path', 512);
            $table->string('owner_username', 190);
            $table->string('kind', 32);
            $table->string('default_access', 32);
            $table->string('public_token', 255)->nullable()->unique('uniq_drive_shares_public_token');
            $table->string('password_hash', 255)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index('path', 'idx_drive_shares_path');
            $table->index('owner_username', 'idx_drive_shares_owner_username');
        });
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('drive_shares');
    }
};
