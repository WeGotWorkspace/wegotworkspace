<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('app_settings')) {
            $this->wgw()->create('app_settings', function (Blueprint $table): void {
                $table->string('name')->primary();
                $table->text('value');
            });
        }

        if (! $this->wgwHasTable('mail_user_credentials')) {
            $this->wgw()->create('mail_user_credentials', function (Blueprint $table): void {
                $table->string('username')->primary();
                $table->string('imap_username')->default('');
                $table->text('password_enc');
                $table->unsignedBigInteger('updated_at');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('mail_user_credentials');
        $this->wgw()->dropIfExists('app_settings');
    }
};
