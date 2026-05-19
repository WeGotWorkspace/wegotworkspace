<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use App\Models\Principal;
use App\Models\User;
use App\Support\AppPaths;
use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class SabreWebdavPutTest extends TestCase
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

        $this->dataDir = sys_get_temp_dir().'/wgw-put-'.uniqid('', true);
        mkdir($this->dataDir, 0775, true);
        mkdir($this->dataDir.'/files/users/alice', 0775, true);
        file_put_contents($this->dataDir.'/.installed', date('c')."\n");

        config(['wgw.data_dir' => $this->dataDir]);
        $this->app->forgetInstance(WgwInstallConfig::class);
        $this->app->forgetInstance(AppPaths::class);
    }

    public function test_put_persists_file_body_through_laravel_front(): void
    {
        $payload = 'office-save-payload-'.random_bytes(8);
        $auth = 'Basic '.base64_encode('alice:secret');

        $this->call(
            'PUT',
            '/files/users/alice/report.docx',
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => $auth,
                'CONTENT_TYPE' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
            $payload,
        )->assertSuccessful();

        $disk = Storage::disk('wgw_files');
        $this->assertTrue($disk->exists('users/alice/report.docx'));
        $this->assertSame($payload, $disk->get('users/alice/report.docx'));
    }
}
