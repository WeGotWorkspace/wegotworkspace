<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

#[Group('MySQLParity')]
final class DriveShareListingQueryTest extends WgwDatabaseTestCase
{
    use DriveTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDriveFixtures();
        $this->ownerToken = $this->userBearerToken();
        for ($i = 0; $i < 25; $i++) {
            $this->createDriveFile($this->ownerToken, '/users/bob', 'bulk-'.$i.'.md');
        }
    }

    protected function tearDown(): void
    {
        $this->tearDownDriveFixtures();
        parent::tearDown();
    }

    private string $ownerToken;

    public function test_listing_shared_directory_does_not_query_grants_per_entry(): void
    {
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => ['carol' => ['access' => 'view']],
        ])->assertOk();

        $memberToken = $this->carolBearerToken();

        DB::connection('wgw')->flushQueryLog();
        DB::connection('wgw')->enableQueryLog();

        $this->withBearer($memberToken)->getJson('/api/v1/files/children?path=/users/bob')
            ->assertOk();

        $grantQueries = 0;
        foreach (DB::connection('wgw')->getQueryLog() as $query) {
            $sql = strtolower((string) ($query['query'] ?? ''));
            if (str_contains($sql, 'drive_share_grants')) {
                $grantQueries++;
            }
        }

        $this->assertLessThanOrEqual(1, $grantQueries, 'Expected at most one drive_share_grants query for listing');
    }
}
