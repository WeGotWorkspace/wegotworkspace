<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Support\Facades\DB;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('app_settings')) {
            return;
        }

        $settingRenames = [
            'meet_stun_url' => 'rtc_stun_url',
            'meet_turn_url' => 'rtc_turn_url',
            'meet_turn_username' => 'rtc_turn_username',
            'meet_turn_credential' => 'rtc_turn_credential',
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
