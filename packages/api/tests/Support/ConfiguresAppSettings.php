<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\AppSetting;

trait ConfiguresAppSettings
{
    protected function setAppSetting(string $name, mixed $value): void
    {
        AppSetting::setValue($name, $value);
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    protected function setAppSettings(array $settings): void
    {
        foreach ($settings as $name => $value) {
            AppSetting::setValue($name, $value);
        }
    }
}
