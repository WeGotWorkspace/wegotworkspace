<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\AppSetting;
use App\Settings\SettingKeys;
use App\Support\TimezoneNormalizer;

final class AdminSettingsService
{
    /**
     * @param array<string, mixed> $values
     *
     * @return array{ok: true, saved: list<string>}
     */
    public function save(array $values): array
    {
        $allowed = array_flip(SettingKeys::all());
        $saved = [];
        foreach ($values as $key => $value) {
            if (! is_string($key) || ! isset($allowed[$key])) {
                continue;
            }
            if ($key === SettingKeys::TIMEZONE) {
                $value = TimezoneNormalizer::normalize($value);
            }
            AppSetting::setValue($key, $value);
            $saved[] = $key;
        }

        return ['ok' => true, 'saved' => $saved];
    }
}
