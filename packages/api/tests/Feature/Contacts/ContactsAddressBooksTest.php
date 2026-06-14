<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsAddressBooksTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_list_address_books_returns_default_book(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks');

        $response->assertOk()
            ->assertJsonStructure([
                'list' => [[
                    'id',
                    'name',
                    'sortOrder',
                    'isDefault',
                    'isSubscribed',
                    'myRights' => ['mayRead', 'mayWrite', 'mayShare', 'mayDelete'],
                ]],
            ])
            ->assertJsonPath('list.0.id', 'default')
            ->assertJsonPath('list.0.name', 'Address book')
            ->assertJsonPath('list.0.isDefault', true)
            ->assertJsonPath('list.0.isSubscribed', true)
            ->assertJsonPath('list.0.myRights.mayRead', true)
            ->assertJsonPath('list.0.myRights.mayWrite', true);
    }

    public function test_show_address_book_returns_single_book(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks/default');

        $response->assertOk()
            ->assertJsonPath('id', 'default')
            ->assertJsonPath('name', 'Address book')
            ->assertJsonPath('isDefault', true);
    }

    public function test_unknown_address_book_returns_not_found(): void
    {
        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks/missing-book')
            ->assertNotFound();
    }

    public function test_users_only_see_own_address_books(): void
    {
        $bobList = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks');
        $bobList->assertOk();
        $this->assertSame(['default'], array_column($bobList->json('list'), 'id'));

        $carolList = $this->withBearer($this->carolBearerToken())
            ->getJson('/api/v1/contacts/addressbooks');
        $carolList->assertOk();
        $this->assertSame(['default'], array_column($carolList->json('list'), 'id'));
    }
}
