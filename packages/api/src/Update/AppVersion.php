<?php

declare(strict_types=1);

namespace App\Update;

use App\Paths;

final class AppVersion
{
    public static function current(): string
    {
        $path = Paths::appRoot().'/VERSION';
        if (!is_readable($path)) {
            return '0.0.0-dev';
        }
        $raw = trim((string) file_get_contents($path));
        if ($raw === '') {
            return '0.0.0-dev';
        }

        return $raw;
    }
}
