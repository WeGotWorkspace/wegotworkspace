<?php

declare(strict_types=1);

namespace Tests\Drive;

use App\Drive\DriveAcl;
use PHPUnit\Framework\TestCase;

final class DriveAclTest extends TestCase
{
    /**
     * @dataProvider userDirectoryAccessProvider
     */
    public function testUserDirectoryReadAccess(string $path, string $username, bool $expected): void
    {
        $allowed = DriveAcl::isPathAllowed($path, $username, [], false);

        self::assertSame($expected, $allowed);
    }

    /**
     * @return iterable<string, array{0:string,1:string,2:bool}>
     */
    public static function userDirectoryAccessProvider(): iterable
    {
        yield 'access own user directory' => ['/users/alice/Documents', 'alice', true];
        yield 'deny other user directory' => ['/users/bob/Documents', 'alice', false];
    }

    /**
     * @dataProvider groupDirectoryAccessProvider
     */
    public function testGroupDirectoryReadAccess(string $path, array $groupSlugs, bool $expected): void
    {
        $allowed = DriveAcl::isPathAllowed($path, 'alice', $groupSlugs, false);

        self::assertSame($expected, $allowed);
    }

    /**
     * @return iterable<string, array{0:string,1:list<string>,2:bool}>
     */
    public static function groupDirectoryAccessProvider(): iterable
    {
        yield 'access group directory with membership' => ['/groups/engineering/specs', ['engineering'], true];
        yield 'deny group directory without membership' => ['/groups/finance/reports', ['engineering'], false];
    }
}
