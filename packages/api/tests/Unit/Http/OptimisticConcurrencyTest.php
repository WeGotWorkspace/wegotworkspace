<?php

declare(strict_types=1);

namespace Tests\Unit\Http;

use App\Http\Support\OptimisticConcurrency;
use PHPUnit\Framework\TestCase;

final class OptimisticConcurrencyTest extends TestCase
{
    public function test_format_etag_quotes_raw_hash(): void
    {
        $this->assertSame('"abc123"', OptimisticConcurrency::formatEtag('abc123'));
    }

    public function test_if_match_satisfied_accepts_quoted_match(): void
    {
        $this->assertTrue(OptimisticConcurrency::ifMatchSatisfied('"abc123"', 'abc123'));
    }

    public function test_if_match_rejects_stale_token(): void
    {
        $this->assertFalse(OptimisticConcurrency::ifMatchSatisfied('"stale"', 'fresh'));
    }

    public function test_if_match_wildcard_matches_non_empty_etag(): void
    {
        $this->assertTrue(OptimisticConcurrency::ifMatchSatisfied('*', 'abc123'));
    }
}
