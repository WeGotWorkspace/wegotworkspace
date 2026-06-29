<?php

declare(strict_types=1);

namespace Tests\Unit\Search;

use App\Services\Search\SearchTokenService;
use PHPUnit\Framework\TestCase;

final class SearchTokenServiceTest extends TestCase
{
    public function test_deduplicates_tokens_with_mixed_unicode_representations(): void
    {
        $service = new SearchTokenService;
        $precomposed = 'één';
        $decomposed = "e\u{0301}én";
        $text = $precomposed.' '.$decomposed.' '.$precomposed;

        $tokens = $service->tokenize($text);

        $this->assertCount(1, $tokens);
        $this->assertSame('één', $tokens[0]);
    }

    public function test_skips_single_character_tokens(): void
    {
        $service = new SearchTokenService;

        $this->assertSame([], $service->tokenize('a b c'));
    }
}
