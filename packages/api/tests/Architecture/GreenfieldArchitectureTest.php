<?php

declare(strict_types=1);

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;

final class GreenfieldArchitectureTest extends TestCase
{
    public function test_greenfield_guard_script_passes(): void
    {
        $script = dirname(__DIR__, 2).'/scripts/greenfield-guard.php';
        $this->assertFileExists($script);

        $cmd = escapeshellarg(PHP_BINARY).' '.escapeshellarg($script).' 2>&1';
        $output = [];
        $exitCode = 0;
        exec($cmd, $output, $exitCode);

        $this->assertSame(
            0,
            $exitCode,
            'greenfield-guard failed:'."\n".implode("\n", $output)
        );
    }

    public function test_legacy_src_directory_must_not_exist(): void
    {
        $this->assertDirectoryDoesNotExist(dirname(__DIR__, 2).'/src');
    }
}
