<?php

declare(strict_types=1);

namespace Tests\Unit\Rtc;

use App\Services\Rtc\RtcSettingsService;
use App\Services\Settings\SettingKeys;
use Tests\Support\WgwDatabaseTestCase;

final class RtcSettingsServiceTest extends WgwDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_settings_normalizes_bare_turn_host(): void
    {
        $this->setAppSettings([
            SettingKeys::RTC_STUN_URL => 'stun.example.com:3478',
            SettingKeys::RTC_TURN_URL => 'turn.example.com:3478?transport=udp',
            SettingKeys::RTC_TURN_USERNAME => 'user',
            SettingKeys::RTC_TURN_CREDENTIAL => 'pass',
        ]);

        $settings = (new RtcSettingsService)->settings();

        $this->assertSame('stun:stun.example.com:3478', $settings['stunUrls']);
        $this->assertSame('turn:turn.example.com:3478?transport=udp', $settings['turnUrls']);
        $this->assertSame('user', $settings['turnUsername']);
        $this->assertSame('pass', $settings['turnPassword']);
        $this->assertArrayNotHasKey('forceRelay', $settings);
    }
}
