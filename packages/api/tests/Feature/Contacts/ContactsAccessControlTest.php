<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use App\Support\WgwSettings;
use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsAccessControlTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_guest_cannot_access_contacts_endpoints(): void
    {
        $this->getJson('/api/v1/contacts/addressbooks')->assertUnauthorized();
        $this->getJson('/api/v1/contacts/addressbooks/default')->assertUnauthorized();
        $this->getJson('/api/v1/contacts/cards?addressBookId=default')->assertUnauthorized();
        $this->getJson('/api/v1/contacts/cards/demo')->assertUnauthorized();
        $this->postJson('/api/v1/contacts/cards', [])->assertUnauthorized();
        $this->putJson('/api/v1/contacts/cards/demo', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/contacts/cards/demo')->assertUnauthorized();
    }

    public function test_authenticated_user_can_access_contacts_when_enabled(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->getJson('/api/v1/contacts/addressbooks')
            ->assertOk();

        $this->withBearer($token)
            ->getJson('/api/v1/contacts/cards?addressBookId=default')
            ->assertOk();
    }

    public function test_admin_can_access_contacts_as_user(): void
    {
        $this->withBearer($this->adminBearerToken())
            ->getJson('/api/v1/contacts/addressbooks')
            ->assertOk();
    }

    public function test_contacts_disabled_returns_forbidden(): void
    {
        $this->setAppSetting(WgwSettings::CONTACTS_ENABLED, false);
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/contacts/addressbooks')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/contacts/addressbooks/default')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/contacts/cards?addressBookId=default')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/contacts/cards/demo')->assertForbidden();
        $this->withBearer($token)->postJson('/api/v1/contacts/cards', [])->assertForbidden();
        $this->withBearer($token)->putJson('/api/v1/contacts/cards/demo', [])->assertForbidden();
        $this->withBearer($token)->deleteJson('/api/v1/contacts/cards/demo')->assertForbidden();
    }
}
