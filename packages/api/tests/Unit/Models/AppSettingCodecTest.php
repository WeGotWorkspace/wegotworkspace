<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\AppSetting;
use PHPUnit\Framework\TestCase;

final class AppSettingCodecTest extends TestCase
{
    public function test_encode_value_stores_plain_strings_without_json_quotes(): void
    {
        $this->assertSame('SabreDAV', AppSetting::encodeValue('SabreDAV'));
        $this->assertSame('/', AppSetting::encodeValue('/'));
    }

    public function test_decode_value_reads_legacy_installer_json_string_values(): void
    {
        $this->assertSame('SabreDAV', AppSetting::decodeValue('"SabreDAV"'));
        $this->assertSame('/', AppSetting::decodeValue('"/"'));
    }

    public function test_decode_value_normalizes_base_uri_from_legacy_json(): void
    {
        $decoded = AppSetting::decodeValue('"/"');
        $this->assertIsString($decoded);
        $this->assertSame('/', $decoded);
    }
}
