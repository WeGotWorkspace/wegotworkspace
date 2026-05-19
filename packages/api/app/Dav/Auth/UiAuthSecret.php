<?php

declare(strict_types=1);

namespace App\Dav\Auth;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\Storage;

/**
 * Shared UI session signing secret (legacy path migration included).
 */
final class UiAuthSecret
{
    private const SECRET_FILE = '.ui-auth-secret';

    public static function ensure(WgwInstallConfig $install): void
    {
        $disk = Storage::disk('wgw_data');
        if ($disk->exists(self::SECRET_FILE)) {
            return;
        }

        $legacyPrimary = rtrim($install->dataDir(), '/').'/drive/ui_auth_gate.secret';
        $legacyDrive = rtrim($install->dataDir(), '/').'/drive/drive_gate.secret';

        foreach ([$legacyPrimary, $legacyDrive] as $legacy) {
            if (is_readable($legacy) && (int) @filesize($legacy) >= 32) {
                $bytes = file_get_contents($legacy);
                if (is_string($bytes) && strlen($bytes) >= 32) {
                    $disk->put(self::SECRET_FILE, $bytes);

                    return;
                }
            }
        }

        $disk->put(self::SECRET_FILE, random_bytes(32));
    }

    public static function read(): ?string
    {
        $disk = Storage::disk('wgw_data');
        if (! $disk->exists(self::SECRET_FILE)) {
            self::ensure(app(WgwInstallConfig::class));
        }
        if (! $disk->exists(self::SECRET_FILE)) {
            return null;
        }
        $raw = $disk->get(self::SECRET_FILE);

        return $raw !== '' ? $raw : null;
    }
}
