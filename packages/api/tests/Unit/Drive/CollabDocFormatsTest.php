<?php

declare(strict_types=1);

namespace Tests\Unit\Drive;

use App\Services\Drive\CollabDocFormats;
use Tests\TestCase;

final class CollabDocFormatsTest extends TestCase
{
    public function test_markdown_paths_are_collab_docs(): void
    {
        $formats = new CollabDocFormats;

        $this->assertTrue($formats->isCollabDocPath('/users/bob/plan.md'));
        $this->assertTrue($formats->isCollabDocPath('/users/bob/plan.markdown'));
        $this->assertSame('markdown', $formats->docTypeForPath('/users/bob/plan.md'));
    }

    public function test_non_markdown_paths_are_not_collab_docs(): void
    {
        $formats = new CollabDocFormats;

        $this->assertFalse($formats->isCollabDocPath('/users/bob/notes.txt'));
        $this->assertFalse($formats->isCollabDocPath('/users/bob/report.pdf'));
        $this->assertNull($formats->docTypeForPath('/users/bob/notes.txt'));
    }
}
