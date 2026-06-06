<?php

declare(strict_types=1);

namespace App\Services\Rtc;

use App\Models\AppSetting;
use App\Services\Settings\SettingKeys;

final class RtcSettingsService
{
    /**
     * @return array{stunUrls: string, turnUrls: string, turnUsername: string, turnPassword: string}
     */
    public function settings(): array
    {
        return [
            'stunUrls' => $this->normalizeRtcUrls(AppSetting::getValue(SettingKeys::RTC_STUN_URL, ''), 'stun'),
            'turnUrls' => $this->normalizeRtcUrls(AppSetting::getValue(SettingKeys::RTC_TURN_URL, ''), 'turn'),
            'turnUsername' => trim((string) AppSetting::getValue(SettingKeys::RTC_TURN_USERNAME, '')),
            'turnPassword' => trim((string) AppSetting::getValue(SettingKeys::RTC_TURN_CREDENTIAL, '')),
        ];
    }

    private function normalizeRtcUrls(mixed $value, string $defaultScheme): string
    {
        if (! is_string($value)) {
            return '';
        }
        $parts = array_filter(
            array_map(
                static fn (string $piece): string => self::normalizeRtcUrl($piece, $defaultScheme),
                preg_split('/[\r\n,]+/', $value) ?: []
            ),
            static fn (string $piece): bool => $piece !== ''
        );

        return implode(', ', $parts);
    }

    private static function normalizeRtcUrl(string $value, string $defaultScheme): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (preg_match('/^(stun|stuns|turn|turns):/i', $trimmed) === 1) {
            return $trimmed;
        }

        return $defaultScheme.':'.$trimmed;
    }
}
