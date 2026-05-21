<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\File;

final class MailSecretService
{
    public function __construct(private WgwInstallConfig $install) {}

    public function ensureSecretFile(): void
    {
        $primary = $this->secretPath();
        if (File::isFile($primary) && File::size($primary) >= 32) {
            return;
        }
        $legacy = $this->install->dataDir().'/drive/drive_gate.secret';
        if (File::isFile($legacy) && File::size($legacy) >= 32) {
            File::copy($legacy, $primary);

            return;
        }
        $dir = dirname($primary);
        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0775, true);
        }
        File::put($primary, random_bytes(32));
    }

    public function readBinary(): ?string
    {
        $primary = $this->secretPath();
        if (File::isFile($primary)) {
            $secret = File::get($primary);
            if (strlen($secret) >= 32) {
                return $secret;
            }
        }
        $legacy = $this->install->dataDir().'/drive/drive_gate.secret';
        if (File::isFile($legacy)) {
            $secret = File::get($legacy);
            if (strlen($secret) >= 32) {
                return $secret;
            }
        }

        return null;
    }

    private function secretPath(): string
    {
        return $this->install->dataDir().'/drive/ui_auth_gate.secret';
    }
}
