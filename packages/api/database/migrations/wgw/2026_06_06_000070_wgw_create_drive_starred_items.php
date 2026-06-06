<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if ($this->wgwHasTable('drive_starred_items')) {
            return;
        }

        $this->wgw()->create('drive_starred_items', function (Blueprint $table): void {
            $table->string('username', 190);
            // 512 keeps (username, path) composite PK under MySQL utf8mb4 index limit (3072 bytes).
            $table->string('path', 512);
            $table->unsignedBigInteger('created_at');
            $table->primary(['username', 'path']);
            $table->index('username', 'idx_drive_starred_user');
        });
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('drive_starred_items');
    }
};
