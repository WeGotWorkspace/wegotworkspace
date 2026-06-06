<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('meet_peers') && ! $this->wgwHasTable('voice_peers')) {
            $this->wgw()->create('meet_peers', function (Blueprint $table): void {
                $table->string('room', 64);
                $table->string('peer_id', 64);
                $table->string('name', 64)->default('');
                $table->string('owner_user', 190)->default('');
                $table->unsignedBigInteger('seen_at');
                $table->primary(['room', 'peer_id']);
                $table->index('room', 'idx_meet_peers_room');
            });
        } elseif ($this->wgwHasTable('meet_peers') && ! $this->wgwHasColumn('meet_peers', 'owner_user')) {
            $this->wgw()->table('meet_peers', function (Blueprint $table): void {
                $table->string('owner_user', 190)->default('');
            });
        }

        if (! $this->wgwHasTable('meet_messages') && ! $this->wgwHasTable('voice_messages')) {
            $this->wgw()->create('meet_messages', function (Blueprint $table): void {
                $table->id();
                $table->string('room', 64);
                $table->string('from_peer', 64);
                $table->string('to_peer', 64);
                $table->string('type', 16);
                $table->longText('payload');
                $table->unsignedBigInteger('created_at');
                $table->index(['room', 'to_peer', 'id'], 'idx_meet_msg_target');
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('meet_messages');
        $this->wgw()->dropIfExists('meet_peers');
    }
};
