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

    public function test_keeps_numeric_tokens_as_strings(): void
    {
        $service = new SearchTokenService;

        $tokens = $service->tokenize('Roadmap 2026 release');

        $this->assertContains('2026', $tokens);
        $this->assertSame('string', gettype($tokens[array_search('2026', $tokens, true)]));
    }
}
