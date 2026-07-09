<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Support\WgwInstallFixture;

abstract class TestCase extends BaseTestCase
{
    protected function tearDown(): void
    {
        if ($this->app) {
            $this->beforeApplicationDestroyed(static function (): void {
                WgwInstallFixture::resetInstallEnv();
            });
        }

        parent::tearDown();

        WgwInstallFixture::resetInstallEnvAfterApplication();
    }
}
