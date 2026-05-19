<?php

declare(strict_types=1);

namespace App\Support;

final class TimezoneNormalizer
{
    public static function normalize(mixed $raw, string $fallback = 'UTC'): string
    {
        $tz = html_entity_decode(trim((string) $raw), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $tz = trim($tz, " \t\n\r\0\x0B\"'");

        if ($tz === '' || ! in_array($tz, timezone_identifiers_list(), true)) {
            return $fallback;
        }

        return $tz;
    }
}
