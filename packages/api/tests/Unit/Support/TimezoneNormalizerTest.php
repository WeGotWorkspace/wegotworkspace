<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\TimezoneNormalizer;
use PHPUnit\Framework\TestCase;

final class TimezoneNormalizerTest extends TestCase
{
    public function test_decodes_html_entity_wrapped_timezone(): void
    {
        $this->assertSame('UTC', TimezoneNormalizer::normalize('&quot;UTC&quot;'));
    }

    public function test_falls_back_for_invalid_timezone(): void
    {
        $this->assertSame('UTC', TimezoneNormalizer::normalize('Not/A_Zone'));
    }
}
