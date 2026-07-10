<?php

declare(strict_types=1);

namespace Tests\Unit\Drive;

use App\Services\Drive\DriveSharePathScope;
use App\Storage\StoragePaths;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class DriveSharePathScopeTest extends TestCase
{
    /**
     * @return iterable<string, array{0: string, 1: string, 2: bool}>
     */
    public static function scopeProvider(): iterable
    {
        yield 'same root' => ['/users/bob/docs', '/users/bob/docs', true];
        yield 'descendant path' => ['/users/bob/docs', '/users/bob/docs/plan.md', true];
        yield 'sibling denied' => ['/users/bob/docs', '/users/bob/private.md', false];
        yield 'parent denied' => ['/users/bob/docs', '/users/bob', false];
        yield 'normalization still in scope' => ['/users/bob/docs', '/users/bob//docs/./plan.md', true];
        yield 'dotdot escape denied' => ['/users/bob/docs', '/users/bob/docs/../private.md', false];
    }

    #[DataProvider('scopeProvider')]
    public function test_scope_check(string $root, string $requested, bool $expected): void
    {
        $scope = new DriveSharePathScope(new StoragePaths);

        $this->assertSame($expected, $scope->isWithin($root, $requested));
    }
}
