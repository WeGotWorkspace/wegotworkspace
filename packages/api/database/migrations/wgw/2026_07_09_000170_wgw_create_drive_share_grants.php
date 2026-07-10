<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if ($this->wgwHasTable('drive_share_grants')) {
            return;
        }

        $this->wgw()->create('drive_share_grants', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('share_id');
            $table->string('grantee_type', 16);
            $table->string('grantee_user', 190)->nullable();
            $table->string('grantee_email', 320)->nullable();
            $table->string('grantee_group', 190)->nullable();
            $table->string('access', 32);
            $table->string('status', 16)->default('active');
            $table->string('invite_token', 255)->nullable()->unique('uniq_drive_share_grants_invite_token');
            $table->timestamps();

            $table->foreign('share_id', 'fk_drive_share_grants_share')
                ->references('id')
                ->on('drive_shares')
                ->cascadeOnDelete();
            $table->unique(['share_id', 'grantee_user'], 'uniq_drive_share_grants_share_user');
            $table->unique(['share_id', 'grantee_email'], 'uniq_drive_share_grants_share_email');
            $table->unique(['share_id', 'grantee_group'], 'uniq_drive_share_grants_share_group');
            $table->index(['grantee_type', 'grantee_user'], 'idx_drive_share_grants_user_lookup');
            $table->index(['grantee_type', 'grantee_email'], 'idx_drive_share_grants_email_lookup');
            $table->index(['grantee_type', 'grantee_group'], 'idx_drive_share_grants_group_lookup');
            $table->index(['share_id', 'status'], 'idx_drive_share_grants_share_status');
        });
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('drive_share_grants');
    }
};
