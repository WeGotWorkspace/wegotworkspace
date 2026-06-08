<?php

declare(strict_types=1);

namespace Tests\Notes;

use App\Services\Notes\NoteMarkdownCodec;
use PHPUnit\Framework\TestCase;

final class NoteMarkdownCodecTest extends TestCase
{
    public function test_rejects_apple_double_sidecar_filenames(): void
    {
        $codec = new NoteMarkdownCodec;
        $this->assertTrue($codec->isNoteFilename('good.md'));
        $this->assertFalse($codec->isNoteFilename('._good.md'));
    }

    public function test_round_trip_markdown(): void
    {
        $codec = new NoteMarkdownCodec;
        $raw = $codec->serialize('Visible', ['planning'], false, 'Hello');
        [$title, $tags, $starred, $body] = $codec->parse($raw, 'fallback');
        $this->assertSame('Visible', $title);
        $this->assertSame(['planning'], $tags);
        $this->assertFalse($starred);
        $this->assertSame('Hello', $body);
    }
}
