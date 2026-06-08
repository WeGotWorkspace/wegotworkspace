<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

abstract class WgwDatabaseTestCase extends TestCase
{
    use InteractsWithWgwBearerTokens;
    use RefreshDatabase;

    /** @var list<string> */
    protected $connectionsToTransact = ['wgw'];

    protected function beforeRefreshingDatabase(): void
    {
        WgwTestDatabase::configureConnection(WgwTestDatabase::driver());
    }

    /**
     * @return array<string, bool|string>
     */
    protected function migrateFreshUsing(): array
    {
        return [
            '--path' => 'database/migrations/wgw',
            '--seed' => false,
        ];
    }

    /**
     * Use Artisan::call so tests do not require mockery/mockery for PendingCommand.
     */
    protected function refreshTestDatabase(): void
    {
        if (! RefreshDatabaseState::$migrated) {
            Artisan::call('migrate:fresh', array_merge(
                ['--force' => true],
                $this->migrateFreshUsing(),
            ));

            $this->app[Kernel::class]->setArtisan(null);

            RefreshDatabaseState::$migrated = true;
        }

        $this->beginDatabaseTransaction();
    }

    /**
     * @return array<string, string>
     */
    protected function wgwJwtConfig(): array
    {
        $keys = AuthTestKeys::rsaPair();

        return [
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ];
    }

    protected function configureWgwJwtKeys(): void
    {
        config($this->wgwJwtConfig());
    }
}
