<?php

declare(strict_types=1);

namespace Tests\Unit\Search;

use App\Services\Search\BestEffortSearchIndexSync;
use PHPUnit\Framework\TestCase;

final class BestEffortSearchIndexSyncTest extends TestCase
{
    public function test_does_not_rethrow_when_sync_callback_fails(): void
    {
        (new BestEffortSearchIndexSync)->sync(
            'contacts',
            static fn (): never => throw new \RuntimeException('boom'),
            'addressbooks/bob/default/card.vcf',
            'bob',
        );

        $this->addToAssertionCount(1);
    }
}
