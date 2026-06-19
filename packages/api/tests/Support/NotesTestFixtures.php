<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use Illuminate\Support\Facades\File;

/**
 * Shared disk + identity fixtures for Notes API feature tests.
 */
trait NotesTestFixtures
{
    use WgwRoleFixtures;

    private string $notesDataDir = '';

    protected function setUpNotesFixtures(): void
    {
        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->notesDataDir = storage_path('framework/testing/wgw-notes-'.uniqid('', true));
        File::ensureDirectoryExists($this->notesDataDir.'/files/users/bob');
        File::ensureDirectoryExists($this->notesDataDir.'/files/users/alice');
        File::ensureDirectoryExists($this->notesDataDir.'/files/users/carol');
        File::ensureDirectoryExists($this->notesDataDir.'/files/groups/team');

        WgwTestDisks::refresh($this->notesDataDir);
        $this->configureWgwJwtKeys();
        config(['wgw.auth_realm' => 'SabreDAV']);
        $this->setAppSetting('auth_realm', 'SabreDAV');
        $this->seedNotesRoleMatrix();
    }

    protected function tearDownNotesFixtures(): void
    {
        if ($this->notesDataDir !== '' && File::isDirectory($this->notesDataDir)) {
            File::deleteDirectory($this->notesDataDir);
        }
    }

    protected function seedNotesRoleMatrix(): void
    {
        if (User::query()->where('username', 'bob')->exists()) {
            return;
        }

        $this->seedWgwUser('bob', displayName: 'Bob');
        $this->seedWgwUser('alice', displayName: 'Alice');
        $this->seedWgwUser('carol', displayName: 'Carol');

        $alice = Principal::forUsername('alice');
        $bob = Principal::forUsername('bob');
        $this->assertNotNull($alice);
        $this->assertNotNull($bob);
        $adminGroup = $this->seedWgwGroup(AdminRoleResolver::ADMIN_GROUP_URI, 'Administrators');
        $this->addPrincipalToGroup($adminGroup, $alice);

        // Shared notebook group: only bob is a member. alice (admin) and carol
        // are deliberately excluded so tests can assert non-members get 403 and
        // that admin does not bypass group membership.
        $team = $this->seedWgwGroup('principals/groups/team', 'Team');
        $this->addPrincipalToGroup($team, $bob);
    }

    protected function carolBearerToken(): string
    {
        return $this->issueBearerTokenFor('carol');
    }

    protected function notesDataDirectory(): string
    {
        return $this->notesDataDir;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array{id: string, item: array<string, mixed>}
     */
    protected function createNoteFor(
        string $token,
        array $overrides = [],
    ): array {
        $payload = array_merge([
            'id' => 'note-'.uniqid('', true),
            'notebook' => 'Drafts',
            'title' => 'Test Note',
            'body' => 'Body text',
            'tags' => ['demo'],
            'starred' => false,
            'archived' => false,
        ], $overrides);

        $response = $this->withBearer($token)->postJson('/api/v1/notes/items', $payload);
        $response->assertCreated();
        $id = (string) $response->json('item.id');

        return ['id' => $id, 'item' => (array) $response->json('item')];
    }
}
