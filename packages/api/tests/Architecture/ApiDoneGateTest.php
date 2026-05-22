<?php

declare(strict_types=1);

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;

/**
 * Documents the API "done gate" — run via {@see composer done-gate} in CI and before merging API work.
 */
final class ApiDoneGateTest extends TestCase
{
    public function test_done_gate_script_is_documented(): void
    {
        $readme = dirname(__DIR__, 2).'/docs/api-done-gate.md';
        $this->assertFileExists($readme);
        $this->assertStringContainsString('done-gate', (string) file_get_contents($readme));
    }
}
