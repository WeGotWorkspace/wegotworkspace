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

    public function test_create_card_minimal_body_succeeds(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Minimal Contact'],
                'emails' => [
                    '550e8400-e29b-41d4-a716-446655440001' => ['address' => 'minimal@example.com'],
                ],
                'phones' => [
                    '550e8400-e29b-41d4-a716-446655440002' => ['number' => '+1-555-0199'],
                ],
                'addresses' => [
                    '550e8400-e29b-41d4-a716-446655440003' => ['full' => '1 Example St', 'countryCode' => 'US'],
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('name.full', 'Minimal Contact');

        $cardId = (string) $response->json('id');
        $this->assertNotSame('', $cardId);

        $emails = $response->json('emails');
        $this->assertIsArray($emails);
        $this->assertContains('minimal@example.com', array_column($emails, 'address'));

        $phones = $response->json('phones');
        $this->assertIsArray($phones);
        $this->assertContains('+1-555-0199', array_column($phones, 'number'));

        $addresses = $response->json('addresses');
        $this->assertIsArray($addresses);
        $this->assertContains('1 Example St', array_column($addresses, 'full'));

        $show = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId);
        $show->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath('version', '1.0');
    }

    /**
     * @dataProvider forbiddenCreateFieldProvider
     */
    public function test_create_card_rejects_server_owned_fields(string $field, mixed $value): void
    {
        $payload = [
            'addressBookIds' => ['default' => true],
            'name' => ['full' => 'Rejected Field'],
            $field => $value,
        ];

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', $payload)
            ->assertStatus(400)
            ->assertJsonPath('code', 'bad_request');
    }

    /**
     * @return array<string, array{0: string, 1: mixed}>
     */
    public static function forbiddenCreateFieldProvider(): array
    {
        return [
            '@type' => ['@type', 'Card'],
            'version' => ['version', '1.0'],
            'id' => ['id', 'client-supplied-id'],
        ];
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
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Jane Smith'],
                'emails' => [
                    '550e8400-e29b-41d4-a716-446655440001' => ['address' => 'jane.smith@example.com'],
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

    public function test_patch_changes_single_email_leaving_others_unchanged(): void
    {
        $emailOne = '550e8400-e29b-41d4-a716-446655440001';
        $emailTwo = '550e8400-e29b-41d4-a716-446655440002';

        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Patch Email Contact'],
                'emails' => [
                    $emailOne => ['address' => 'primary@example.com'],
                    $emailTwo => ['address' => 'secondary@example.com'],
                ],
            ]);

        $create->assertCreated();
        $cardId = (string) $create->json('id');

        $response = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                'emails' => [
                    $emailOne => ['address' => 'updated-primary@example.com'],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonPath('emails.'.$emailOne.'.address', 'updated-primary@example.com')
            ->assertJsonPath('emails.'.$emailTwo.'.address', 'secondary@example.com');
    }

    public function test_patch_removes_phone_via_null_map_entry(): void
    {
        $phoneId = '550e8400-e29b-41d4-a716-446655440002';

        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Patch Phone Contact'],
                'phones' => [
                    $phoneId => ['number' => '+1-555-0100'],
                ],
            ]);

        $create->assertCreated();
        $cardId = (string) $create->json('id');

        $response = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                'phones' => [
                    $phoneId => null,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonMissingPath('phones.'.$phoneId);
    }

    /**
     * @dataProvider forbiddenCreateFieldProvider
     */
    public function test_patch_rejects_server_owned_fields(string $field, mixed $value): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));

        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                $field => $value,
            ])
            ->assertStatus(400)
            ->assertJsonPath('code', 'bad_request');
    }

    public function test_patch_preserves_fields_not_in_patch_body(): void
    {
        $emailId = '550e8400-e29b-41d4-a716-446655440001';
        $phoneId = '550e8400-e29b-41d4-a716-446655440002';

        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Preserve Fields Contact'],
                'emails' => [
                    $emailId => ['address' => 'keep@example.com'],
                ],
                'phones' => [
                    $phoneId => ['number' => '+1-555-0199'],
                ],
            ]);

        $create->assertCreated();
        $cardId = (string) $create->json('id');

        $response = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                'name' => ['full' => 'Renamed Contact'],
            ]);

        $response->assertOk()
            ->assertJsonPath('name.full', 'Renamed Contact')
            ->assertJsonPath('emails.'.$emailId.'.address', 'keep@example.com')
            ->assertJsonPath('phones.'.$phoneId.'.number', '+1-555-0199');
    }
}
