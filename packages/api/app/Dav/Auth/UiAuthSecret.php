<?php

declare(strict_types=1);

namespace App\Dav\Auth;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Shared UI session signing secret (legacy path migration included).
 */
final class UiAuthSecret
{
    private const SECRET_FILE = '.ui-auth-secret';

    private const LEGACY_SECRET_NAMES = [
        'ui_auth_gate.secret',
        'drive_gate.secret',
    ];

    public static function ensure(WgwInstallConfig $install): void
    {
        $disk = Storage::disk('wgw_data');
        if ($disk->exists(self::SECRET_FILE)) {
            return;
        }

        $legacyDir = rtrim($install->dataDir(), '/').'/drive';
        foreach (self::LEGACY_SECRET_NAMES as $name) {
            $legacy = $legacyDir.'/'.$name;
            if (! File::isFile($legacy) || File::size($legacy) < 32) {
                continue;
            }
            $bytes = File::get($legacy);
            if (strlen($bytes) >= 32) {
                $disk->put(self::SECRET_FILE, $bytes);

                return;
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
