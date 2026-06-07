<?php

declare(strict_types=1);

namespace Tests\Feature\Collab;

use App\Models\Principal;
use App\Models\User;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwTestDisks;

final class CollabDocumentEndpointsTest extends WgwDatabaseTestCase
{
    private const ROOM = '/users/alice/docs/together.md';

    private const ROOM_WITH_SPACES = '/users/alice/docs/Hello World.md';

    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-collab-doc-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice/docs');
        WgwTestDisks::refresh($this->dataDir);
        $this->configureWgwJwtKeys();

        User::query()->insert([
            'id' => 1,
            'username' => 'alice',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 1,
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_get_document_requires_auth(): void
    {
        $this->getJson('/api/v1/files/collaboration?path='.urlencode(self::ROOM))
            ->assertUnauthorized();
    }

    public function test_markdown_and_yjs_sidecar_round_trip(): void
    {
        $token = $this->issueToken();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::ROOM))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8')
            ->assertSeeText('# Collaborative document');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::ROOM).'&format=yjs')
            ->assertNoContent();

        $yjsBytes = [1, 2, 3, 255];
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::ROOM), [
                'markdown' => "# Together\n\nHello collab.\n",
                'yjs' => $yjsBytes,
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $storage = app(WgwStorage::class)->files();
        $storedMarkdown = (string) $storage->get('users/alice/docs/together.md');
        $this->assertStringContainsString('# Together', $storedMarkdown);
        $this->assertStringContainsString('Hello collab.', $storedMarkdown);
        $this->assertSame(
            "\x01\x02\x03\xff",
            $storage->get('users/alice/docs/.together.md.yjs')
        );

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::ROOM))
            ->assertOk()
            ->assertSeeText('Hello collab.');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::ROOM).'&format=yjs')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/octet-stream')
            ->assertContent("\x01\x02\x03\xff");
    }

    public function test_other_user_cannot_write_alice_document(): void
    {
        User::query()->insert([
            'id' => 2,
            'username' => 'bob',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
            'digesta1' => '',
        ]);
        Principal::query()->insert([
            'id' => 2,
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->issueToken('bob'))
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::ROOM), [
                'markdown' => 'nope',
            ])
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');
    }

    public function test_document_room_with_spaces_is_supported(): void
    {
        $token = $this->issueToken();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode(self::ROOM_WITH_SPACES), [
                'markdown' => "# Hello World\n",
                'yjs' => [0, 0],
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->get('/api/v1/files/collaboration?path='.urlencode(self::ROOM_WITH_SPACES))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8')
            ->assertSeeText('# Hello World');
    }

    private function issueToken(string $username = 'alice'): string
    {
        $response = $this->postJson('/api/v1/auth/token', [
            'username' => $username,
            'password' => 'secret',
        ]);
        $response->assertOk();

        return (string) $response->json('access_token');
    }
}
