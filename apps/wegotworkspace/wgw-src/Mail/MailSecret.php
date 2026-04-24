<?php

declare(strict_types=1);

namespace App\Mail;

use App\Paths;

/**
 * Reads the same secret material as {@see \App\SabreUiAuthGate} for encrypting per-user mail credentials.
 */
final class MailSecret
{
    /**
     * Ensures the same secret file {@see \App\SabreUiAuthGate} uses exists so mail passwords can be encrypted.
     */
    public static function ensureSecretFile(): void
    {
        $primary = Paths::filegatorData().'/ui_auth_gate.secret';
        if (is_readable($primary) && (int) @filesize($primary) >= 32) {
            return;
        }
        $legacy = Paths::filegatorData().'/drive_gate.secret';
        if (is_readable($legacy) && (int) @filesize($legacy) >= 32) {
            @copy($legacy, $primary);
            if (is_readable($primary) && (int) @filesize($primary) >= 32) {
                return;
            }
        }
        $dir = dirname($primary);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        file_put_contents($primary, random_bytes(32), LOCK_EX);
    }

    public static function readBinary(): ?string
    {
        $primary = Paths::filegatorData().'/ui_auth_gate.secret';
        if (is_readable($primary)) {
            $s = file_get_contents($primary);
            if ($s !== false && strlen($s) >= 32) {
                return $s;
            }
        }
        $legacy = Paths::filegatorData().'/drive_gate.secret';
        if (is_readable($legacy)) {
            $s = file_get_contents($legacy);
            if ($s !== false && strlen($s) >= 32) {
                return $s;
            }
        }

        return null;
    }
}
