<?php

declare(strict_types=1);

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;

final class GreenfieldArchitectureTest extends TestCase
{
    public function test_greenfield_guard_script_passes_or_skips(): void
    {
        $script = dirname(__DIR__, 2).'/scripts/greenfield-guard.php';
        $this->assertFileExists($script);

        $cmd = escapeshellarg(PHP_BINARY).' '.escapeshellarg($script).' 2>&1';
        $output = [];
        $exitCode = 0;
        exec($cmd, $output, $exitCode);

        $this->assertContains(
            $exitCode,
            [0, 1],
            'guard must exit 0 (ok/skip) or 1 (violations): '.implode("\n", $output)
        );

        if ($exitCode === 1) {
            $this->fail("greenfield-guard failed:\n".implode("\n", $output));
        }
    }

    public function test_legacy_src_must_not_gain_domain_route_service(): void
    {
        $legacy = dirname(__DIR__, 2).'/src';
        if (! is_dir($legacy)) {
            $this->markTestSkipped('Legacy src/ not present.');
        }

        $this->assertFileDoesNotExist($legacy.'/Api/DomainRouteService.php');
    }
}
