<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if ($this->wgwHasTable('drive_share_sessions')) {
            return;
        }

        $this->wgw()->create('drive_share_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('share_id');
            $table->string('session_key', 255)->unique('uniq_drive_share_sessions_session_key');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('share_id', 'fk_drive_share_sessions_share')
                ->references('id')
                ->on('drive_shares')
                ->cascadeOnDelete();
            $table->index(['share_id', 'revoked_at'], 'idx_drive_share_sessions_share_revoked');
        });
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('drive_share_sessions');
    }
};
