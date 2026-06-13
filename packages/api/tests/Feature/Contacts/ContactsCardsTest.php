<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsCardsTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_list_cards_in_address_book(): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards?addressBookId=default');

        $response->assertOk()
            ->assertJsonCount(1, 'list')
            ->assertJsonPath('list.0.id', $cardId)
            ->assertJsonPath('list.0.@type', 'Card')
            ->assertJsonPath('list.0.version', '1.0')
            ->assertJsonPath('list.0.addressBookIds.default', true)
            ->assertJsonPath('list.0.name.full', 'Jane Doe');
    }

    public function test_show_card_returns_jscontact_card(): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId);

        $response->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath('name.full', 'Jane Doe')
            ->assertJsonPath('addressBookIds.default', true);
    }

    public function test_create_card_persists_and_returns_contact_card(): void
    {
        $payload = $this->sampleContactCardPayload();

        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', $payload);

        $response->assertCreated()
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('addressBookIds.default', true)
            ->assertJsonPath('name.full', 'New Contact');

        $cardId = (string) $response->json('id');
        $this->assertNotSame('', $cardId);

        $list = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards?addressBookId=default');
        $list->assertOk();
        $this->assertContains($cardId, array_column($list->json('list'), 'id'));
    }

    public function test_update_card_replaces_fields(): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $response = $this->withBearer($this->userBearerToken())
            ->putJson('/api/v1/contacts/cards/'.$cardId, [
                '@type' => 'Card',
                'version' => '1.0',
                'uid' => 'urn:uuid:550e8400-e29b-41d4-a716-446655440000',
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Jane Smith'],
                'emails' => [
                    'email-1' => ['email' => 'jane.smith@example.com'],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonPath('name.full', 'Jane Smith');

        $show = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId);
        $show->assertOk()
            ->assertJsonPath('name.full', 'Jane Smith');
    }

    public function test_delete_card_removes_from_list(): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/contacts/cards/'.$cardId)
            ->assertOk()
            ->assertJsonPath('ok', true);

        $list = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards?addressBookId=default');
        $list->assertOk()->assertJsonPath('list', []);

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId)
            ->assertNotFound();
    }

    public function test_user_cannot_read_other_users_card(): void
    {
        $cardId = $this->seedCardViaPdo('carol', 'carol-contact.vcf', $this->sampleVcard('Carol Contact'));

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId)
            ->assertNotFound();
    }
}
