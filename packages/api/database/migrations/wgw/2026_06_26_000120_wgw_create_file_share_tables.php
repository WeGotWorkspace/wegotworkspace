<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('file_shares')) {
            $this->wgw()->create('file_shares', function (Blueprint $table): void {
                $table->string('id', 26)->primary();
                $table->string('token', 128)->unique('idx_file_shares_token');
                $table->string('owner_username', 190);
                // 512 mirrors drive_starred_items.path; stays under the MySQL utf8mb4 index limit.
                $table->string('target_path', 512);
                $table->string('target_type', 8);
                $table->string('public_access', 8)->default('none');
                $table->dateTime('expires_at')->nullable();
                $table->dateTime('created_at')->nullable();
                $table->dateTime('updated_at')->nullable();
                $table->index('owner_username', 'idx_file_shares_owner');
                $table->index('target_path', 'idx_file_shares_target');
            });
        }

        if (! $this->wgwHasTable('file_share_grants')) {
            $this->wgw()->create('file_share_grants', function (Blueprint $table): void {
                $table->string('id', 26)->primary();
                $table->string('share_id', 26);
                $table->string('email', 254);
                $table->string('permission', 8)->default('read');
                $table->string('status', 12)->default('pending');
                $table->string('invite_token', 128)->unique('idx_file_share_grants_invite');
                $table->string('access_token', 128)->nullable()->unique('idx_file_share_grants_access');
                $table->dateTime('confirmed_at')->nullable();
                $table->dateTime('created_at')->nullable();
                $table->dateTime('updated_at')->nullable();
                $table->unique(['share_id', 'email'], 'idx_file_share_grants_share_email');
                $table->index('share_id', 'idx_file_share_grants_share');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('file_share_grants');
        $this->wgw()->dropIfExists('file_shares');
    }
};
