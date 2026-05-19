<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\UiSessionService;
use App\Support\AppPaths;
use App\Support\WgwInstallConfig;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class SabreWebdavGetTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        \Illuminate\Support\Facades\DB::purge('wgw');
        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applySabreTables();

        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);

        $this->dataDir = sys_get_temp_dir().'/wgw-get-'.uniqid('', true);
        mkdir($this->dataDir, 0775, true);
        mkdir($this->dataDir.'/files/users/alice', 0775, true);
        file_put_contents($this->dataDir.'/.installed', date('c')."\n");

        config(['wgw.data_dir' => $this->dataDir]);
        $this->app->forgetInstance(WgwInstallConfig::class);
        $this->app->forgetInstance(AppPaths::class);
    }

    public function test_get_returns_file_body_with_basic_auth(): void
    {
        $payload = 'docx-bytes-'.random_bytes(4);
        Storage::disk('wgw_files')->put('users/alice/basic.docx', $payload);

        $auth = 'Basic '.base64_encode('alice:secret');

        $response = $this->call(
            'GET',
            '/files/users/alice/basic.docx',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
        );

        $response->assertSuccessful();
        $this->assertSame($payload, $response->streamedContent());
    }

    public function test_get_returns_file_body_with_ui_auth_cookie(): void
    {
        $payload = 'docx-cookie-'.random_bytes(4);
        Storage::disk('wgw_files')->put('users/alice/cookie.docx', $payload);

        $realm = (string) (WgwSettings::normalized()[WgwSettings::AUTH_REALM] ?? 'SabreDAV');
        $cookie = $this->app->make(UiSessionService::class)->buildCookie('alice', $realm, '/');

        $response = $this->withUnencryptedCookie('sabre_ui_auth', $cookie->getValue())
            ->get('/files/users/alice/cookie.docx');

        $response->assertSuccessful();
        $this->assertSame($payload, $response->streamedContent());
    }
}
