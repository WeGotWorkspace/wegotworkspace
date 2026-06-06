<?php

declare(strict_types=1);

namespace Tests\Unit\Rtc;

use App\Models\AppSetting;
use App\Services\Rtc\RtcSettingsService;
use App\Settings\SettingKeys;
use Illuminate\Support\Facades\DB;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class RtcSettingsServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');

        SqliteWgwSchema::applyCoreTables();
    }

    public function test_settings_normalizes_bare_turn_host(): void
    {
        AppSetting::setValue(SettingKeys::RTC_STUN_URL, 'stun.example.com:3478');
        AppSetting::setValue(SettingKeys::RTC_TURN_URL, 'turn.example.com:3478?transport=udp');
        AppSetting::setValue(SettingKeys::RTC_TURN_USERNAME, 'user');
        AppSetting::setValue(SettingKeys::RTC_TURN_CREDENTIAL, 'pass');

        $settings = (new RtcSettingsService)->settings();

        $this->assertSame('stun:stun.example.com:3478', $settings['stunUrls']);
        $this->assertSame('turn:turn.example.com:3478?transport=udp', $settings['turnUrls']);
        $this->assertSame('user', $settings['turnUsername']);
        $this->assertSame('pass', $settings['turnPassword']);
        $this->assertArrayNotHasKey('forceRelay', $settings);
    }
}
