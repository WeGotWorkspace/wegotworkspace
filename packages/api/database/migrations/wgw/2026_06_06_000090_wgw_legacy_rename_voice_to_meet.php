<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends WgwMigration
{
    public function up(): void
    {
        $driver = DB::connection('wgw')->getDriverName();

        if ($this->wgwHasTable('voice_peers') && ! $this->wgwHasTable('meet_peers')) {
            if ($driver === 'mysql') {
                if ($this->wgwHasTable('voice_messages')) {
                    DB::connection('wgw')->statement('RENAME TABLE voice_peers TO meet_peers, voice_messages TO meet_messages');
                } else {
                    DB::connection('wgw')->statement('RENAME TABLE voice_peers TO meet_peers');
                }
            } else {
                DB::connection('wgw')->statement('ALTER TABLE voice_peers RENAME TO meet_peers');
                if ($this->wgwHasTable('voice_messages')) {
                    DB::connection('wgw')->statement('ALTER TABLE voice_messages RENAME TO meet_messages');
                }
            }
        }

        if ($this->wgwHasTable('meet_peers') && ! $this->wgwHasColumn('meet_peers', 'owner_user')) {
            $this->wgw()->table('meet_peers', function (Blueprint $table): void {
                $table->string('owner_user', 190)->default('');
            });
        }

        if (! $this->wgwHasTable('app_settings')) {
            return;
        }

        $settingRenames = [
            'voice_stun_url' => 'meet_stun_url',
            'voice_turn_url' => 'meet_turn_url',
            'voice_turn_username' => 'meet_turn_username',
            'voice_turn_credential' => 'meet_turn_credential',
        ];

        foreach ($settingRenames as $from => $to) {
            DB::connection('wgw')->table('app_settings')
                ->where('name', $from)
                ->update(['name' => $to]);
        }
    }

    public function down(): void
    {
        // Legacy data migration; no down.
    }
};
