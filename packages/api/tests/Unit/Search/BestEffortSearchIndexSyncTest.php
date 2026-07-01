<?php

declare(strict_types=1);

namespace Tests\Unit\Search;

use App\Services\Search\BestEffortSearchIndexSync;
use Illuminate\Database\QueryException;
use PHPUnit\Framework\TestCase;

final class BestEffortSearchIndexSyncTest extends TestCase
{
    public function test_sync_swallows_query_exception(): void
    {
        $sync = new BestEffortSearchIndexSync;
        $sync->sync(
            'collab',
            fn () => throw new QueryException(
                'wgw',
                'insert into search_terms ...',
                [],
                new \Exception('SQLSTATE[23000]: Integrity constraint violation'),
            ),
            'files/groups/team/plan.md',
        );

        $this->expectNotToPerformAssertions();
    }

    public function test_sync_swallows_generic_throwable(): void
    {
        $sync = new BestEffortSearchIndexSync;
        $sync->sync('collab', fn () => throw new \RuntimeException('index failed'));

        $this->expectNotToPerformAssertions();
    }
}
