<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Models\AppSetting;
use App\Settings\SettingKeys;

final class InstallerAppSettingsWriter
{
    /**
     * @param  array<string, mixed>  $values
     */
    public function replaceMany(\PDO $pdo, array $values): void
    {
        $allowed = array_flip(SettingKeys::all());
        $clean = [];
        foreach ($values as $key => $value) {
            if (is_string($key) && isset($allowed[$key])) {
                $clean[$key] = $value;
            }
        }
        if ($clean === []) {
            return;
        }

        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $this->replaceManyMysql($pdo, $clean);

            return;
        }

        $stmt = $pdo->prepare('INSERT OR REPLACE INTO app_settings (name, value) VALUES (?, ?)');
        foreach ($clean as $name => $value) {
            $stmt->execute([$name, $this->encode($value)]);
        }
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function replaceManyMysql(\PDO $pdo, array $values): void
    {
        $stmt = $pdo->prepare('INSERT INTO app_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)');
        foreach ($values as $name => $value) {
            $stmt->execute([$name, $this->encode($value)]);
        }
    }

    private function encode(mixed $value): string
    {
        return AppSetting::encodeValue($value);
    }
}
