<?php

declare(strict_types=1);

namespace Tests\Feature\Meet;

use App\Services\Settings\SettingKeys;
use Tests\Support\MeetTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class MeetRtcConfigurationTest extends WgwDatabaseTestCase
{
    use MeetTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpMeetFixtures();
    }

    public function test_rtc_settings_endpoint_exposes_meet_ice_values(): void
    {
        $this->setAppSettings([
            SettingKeys::RTC_STUN_URL => "one.example.org:3478, \nstun:two.example.org",
            SettingKeys::RTC_TURN_URL => "turn:one.example.org\nturn-two.example.org:3478?transport=udp",
            SettingKeys::RTC_TURN_USERNAME => 'rtc-user',
            SettingKeys::RTC_TURN_CREDENTIAL => 'rtc-pass',
        ]);

        $response = $this->getJson($this->meetRoomPath('/configuration'));

        $response->assertOk();
        $response->assertJson([
            'rtc' => [
                'stunUrls' => 'stun:one.example.org:3478, stun:two.example.org',
                'turnUrls' => 'turn:one.example.org, turn:turn-two.example.org:3478?transport=udp',
                'turnUsername' => 'rtc-user',
                'turnPassword' => 'rtc-pass',
            ],
        ]);
        $response->assertJsonMissing(['forceRelay' => true]);
    }

    public function test_rtc_configuration_does_not_require_authentication(): void
    {
        $this->setAppSettings([
            SettingKeys::RTC_STUN_URL => 'stun.public.test:3478',
            SettingKeys::RTC_TURN_URL => '',
            SettingKeys::RTC_TURN_USERNAME => '',
            SettingKeys::RTC_TURN_CREDENTIAL => '',
        ]);

        $this->getJson($this->meetRoomPath('/configuration'))
            ->assertOk()
            ->assertJsonPath('rtc.stunUrls', 'stun:stun.public.test:3478');
    }

    public function test_rtc_configuration_returns_empty_turn_when_unconfigured(): void
    {
        $this->setAppSettings([
            SettingKeys::RTC_STUN_URL => '',
            SettingKeys::RTC_TURN_URL => '',
            SettingKeys::RTC_TURN_USERNAME => '',
            SettingKeys::RTC_TURN_CREDENTIAL => '',
        ]);

        $this->getJson($this->meetRoomPath('/configuration'))
            ->assertOk()
            ->assertJsonPath('rtc.stunUrls', '')
            ->assertJsonPath('rtc.turnUrls', '')
            ->assertJsonPath('rtc.turnUsername', '')
            ->assertJsonPath('rtc.turnPassword', '');
    }
}
