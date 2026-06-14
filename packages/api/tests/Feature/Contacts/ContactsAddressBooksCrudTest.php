<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsAddressBooksCrudTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_create_address_book_returns_new_book(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/addressbooks', [
                'name' => 'Work contacts',
                'id' => 'work',
                'description' => 'Work-only cards',
            ]);

        $response->assertCreated()
            ->assertJsonPath('id', 'work')
            ->assertJsonPath('name', 'Work contacts')
            ->assertJsonPath('description', 'Work-only cards')
            ->assertJsonPath('myRights.mayDelete', true);
    }

    public function test_patch_address_book_updates_name(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/addressbooks', [
                'name' => 'Friends',
                'id' => 'friends',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/addressbooks/friends', [
                'name' => 'Close friends',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Close friends');
    }

    public function test_delete_empty_address_book_succeeds(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/addressbooks', [
                'name' => 'Temporary',
                'id' => 'temp-book',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/contacts/addressbooks/temp-book')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks/temp-book')
            ->assertNotFound();
    }

    public function test_delete_default_address_book_is_forbidden(): void
    {
        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/contacts/addressbooks/default')
            ->assertForbidden();
    }

    public function test_delete_address_book_with_cards_requires_on_destroy_flag(): void
    {
        $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/addressbooks', [
                'name' => 'Has cards',
                'id' => 'has-cards',
            ])
            ->assertCreated();

        $cardId = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload('has-cards'),
                ['name' => ['full' => 'In extra book']],
            ))
            ->assertCreated()
            ->json('id');

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/contacts/addressbooks/has-cards')
            ->assertStatus(409);

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/contacts/addressbooks/has-cards', [
                'onDestroyRemoveContents' => true,
            ])
            ->assertOk();

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId)
            ->assertNotFound();
    }

    public function test_share_with_is_rejected_on_patch(): void
    {
        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/addressbooks/default', [
                'shareWith' => ['alice' => ['mayRead' => true]],
            ])
            ->assertBadRequest();
    }
}
