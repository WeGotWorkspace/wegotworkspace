<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use Illuminate\Support\Facades\Storage;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwInstallFixture;

final class SabreWebdavPutTest extends WgwDatabaseTestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedWgwUser('alice', displayName: 'Alice');

        $installRoot = sys_get_temp_dir().'/wgw-put-root-'.uniqid('', true);
        mkdir($installRoot, 0775, true);
        file_put_contents($installRoot.'/index.php', "<?php\n");
        $this->dataDir = $installRoot.'/wgw-content';
        mkdir($this->dataDir.'/files/users/alice', 0775, true);
        putenv('WGW_APP_ROOT='.$installRoot);
        $_ENV['WGW_APP_ROOT'] = $installRoot;
        WgwInstallFixture::markInstalled($installRoot, $this->dataDir, 'alice');

        config(['wgw.data_dir' => $this->dataDir]);
        WgwInstallFixture::forgetInstallBindings();
    }

    public function test_put_persists_file_body_through_laravel_front(): void
    {
        $payload = 'docx-save-payload-'.random_bytes(8);
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
