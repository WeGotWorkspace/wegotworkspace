<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use App\Models\Principal;
use App\Models\User;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwTestDisks;

final class FilesEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-files-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);
        $this->configureWgwJwtKeys();

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

        app(WgwStorage::class)->files()->put('users/alice/welcome.txt', 'hello');
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_files_context_listing_create_and_star_flow(): void
    {
        $token = $this->issueToken();

        $user = $this->withBearer($token)->getJson('/api/v1/files/context');
        $user->assertOk()
            ->assertJsonPath('data.username', 'alice')
            ->assertJsonPath('data.name', 'Alice')
            ->assertJsonPath('data.roots', ['/users', '/groups']);

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/alice');
        $listing->assertOk()
            ->assertJsonPath('data.location', '/users/alice/')
            ->assertJsonFragment(['name' => 'welcome.txt', 'type' => 'file']);

        $create = $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/alice', [
            'name' => 'Projects',
        ]);
        $create->assertOk()->assertJsonPath('data', 'Created');

        $star = $this->withBearer($token)->postJson('/api/v1/files/star?path=/users/alice/welcome.txt');
        $star->assertOk()->assertJsonPath('data', 'Updated');

        $stars = $this->withBearer($token)->getJson('/api/v1/files/starred');
        $stars->assertOk()
            ->assertJsonPath('data.paths', ['/users/alice/welcome.txt']);
    }

    public function test_files_content_downloads_by_plain_path_query(): void
    {
        $token = $this->issueToken();

        $response = $this->withBearer($token)
            ->get('/api/v1/files/content?path=/users/alice/welcome.txt');

        $response->assertOk()
            ->assertHeader('content-type', 'text/plain; charset=utf-8');

        $this->assertSame('hello', $response->streamedContent());
    }

    public function test_files_patch_renames_in_place(): void
    {
        $token = $this->issueToken();

        $rename = $this->withBearer($token)->patchJson('/api/v1/files?path=/users/alice/welcome.txt', [
            'name' => 'hello.txt',
        ]);
        $rename->assertOk()->assertJsonPath('data', 'Renamed');

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/alice');
        $listing->assertOk()
            ->assertJsonFragment(['name' => 'hello.txt', 'type' => 'file'])
            ->assertJsonMissing(['name' => 'welcome.txt']);
    }

    public function test_files_patch_moves_to_destination(): void
    {
        $token = $this->issueToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/alice', [
            'name' => 'Archive',
        ])->assertOk();

        $move = $this->withBearer($token)->patchJson('/api/v1/files?path=/users/alice/welcome.txt', [
            'name' => 'welcome.txt',
            'destination' => '/users/alice/Archive',
        ]);
        $move->assertOk()->assertJsonPath('data', 'Renamed');

        $source = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/alice');
        $source->assertOk()->assertJsonMissing(['name' => 'welcome.txt']);

        $dest = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/alice/Archive');
        $dest->assertOk()
            ->assertJsonFragment(['name' => 'welcome.txt', 'type' => 'file']);
    }

    private function issueToken(): string
    {
        return (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');
    }

    private function withBearer(string $token): static
    {
        return $this->withHeader('Authorization', 'Bearer '.$token);
    }
}
