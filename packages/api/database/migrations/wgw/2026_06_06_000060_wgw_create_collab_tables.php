<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('collab_peers')) {
            $this->wgw()->create('collab_peers', function (Blueprint $table): void {
                $table->string('room', 190);
                $table->string('peer_id', 16);
                $table->string('name', 64)->default('');
                $table->string('owner_user', 190)->default('');
                $table->unsignedBigInteger('seen_at');
                $table->primary(['room', 'peer_id']);
                $table->index('room', 'idx_collab_peers_room');
            });
        }

        if (! $this->wgwHasTable('collab_messages')) {
            $this->wgw()->create('collab_messages', function (Blueprint $table): void {
                $table->id();
                $table->string('room', 190);
                $table->string('from_peer', 16);
                $table->string('to_peer', 16);
                $table->string('type', 16);
                $table->longText('payload');
                $table->unsignedBigInteger('created_at');
                $table->index(['room', 'to_peer', 'id'], 'idx_collab_msg_target');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('collab_messages');
        $this->wgw()->dropIfExists('collab_peers');
    }
};
