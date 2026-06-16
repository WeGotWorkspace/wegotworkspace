<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\OptimisticConcurrencyTestHelpers;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsCardsTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;
    use OptimisticConcurrencyTestHelpers;

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

    public function test_create_card_accepts_name_components_without_full(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'kind' => 'individual',
                'name' => [
                    'isOrdered' => false,
                    'components' => [
                        ['kind' => 'given', 'value' => 'Wouter'],
                        ['kind' => 'surname', 'value' => 'Vendrik'],
                    ],
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('name.full', 'Wouter Vendrik')
            ->assertJsonPath('name.components.0.value', 'Wouter')
            ->assertJsonPath('name.components.1.value', 'Vendrik');
    }

    public function test_create_card_accepts_empty_name_full_with_components(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'kind' => 'individual',
                'name' => [
                    'isOrdered' => false,
                    'components' => [
                        ['kind' => 'given', 'value' => 'Jane'],
                        ['kind' => 'surname', 'value' => 'Doe'],
                    ],
                    'full' => '',
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('name.full', 'Jane Doe');
    }

    /**
     * @dataProvider sparseCreateCardProvider
     *
     * @param  array<string, mixed>  $extra
     */
    public function test_create_card_accepts_sparse_body(array $extra, string $assertPath, mixed $assertValue): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                ['addressBookIds' => ['default' => true]],
                $extra,
            ));

        $response->assertCreated()
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath($assertPath, $assertValue);
    }

    /**
     * @return array<string, array{0: array<string, mixed>, 1: string, 2: mixed}>
     */
    public static function sparseCreateCardProvider(): array
    {
        $phoneId = '550e8400-e29b-41d4-a716-446655440010';
        $emailId = '550e8400-e29b-41d4-a716-446655440011';
        $noteId = '550e8400-e29b-41d4-a716-446655440012';
        $orgId = '550e8400-e29b-41d4-a716-446655440013';
        $linkId = '550e8400-e29b-41d4-a716-446655440014';
        $addrId = '550e8400-e29b-41d4-a716-446655440015';

        return [
            'phone only' => [
                ['phones' => [$phoneId => ['number' => '+1-555-0200']]],
                'phones.'.$phoneId.'.number',
                '+1-555-0200',
            ],
            'email only' => [
                ['emails' => [$emailId => ['address' => 'solo@example.com']]],
                'emails.'.$emailId.'.address',
                'solo@example.com',
            ],
            'note only' => [
                ['notes' => [$noteId => ['note' => 'Just a note']]],
                'notes.'.$noteId.'.note',
                'Just a note',
            ],
            'organization only' => [
                ['organizations' => [$orgId => ['name' => 'Acme Inc']]],
                'organizations.'.$orgId.'.name',
                'Acme Inc',
            ],
            'url only' => [
                ['links' => [$linkId => ['uri' => 'https://example.org']]],
                'links.'.$linkId.'.uri',
                'https://example.org',
            ],
            'address only' => [
                ['addresses' => [$addrId => ['full' => '42 Sparse Lane']]],
                'addresses.'.$addrId.'.full',
                '42 Sparse Lane',
            ],
        ];
    }

    public function test_update_card_replaces_fields(): void
    {
        $cardId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', $this->sampleVcard('Jane Doe'));
        $url = '/api/v1/contacts/cards/'.$cardId;

        $response = $this->withBearer($this->userBearerToken())
            ->putJson($url, [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'Jane Smith'],
                'emails' => [
                    '550e8400-e29b-41d4-a716-446655440001' => ['address' => 'jane.smith@example.com'],
                ],
            ], $this->withIfMatch($this->fetchEtagFromGet($url)));

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
        $url = '/api/v1/contacts/cards/'.$cardId;

        $this->withBearer($this->userBearerToken())
            ->deleteJson($url, [], $this->withIfMatch($this->fetchEtagFromGet($url)))
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
            ], $this->ifMatchFromResponse($create));

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
            ], $this->ifMatchFromResponse($create));

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
        $url = '/api/v1/contacts/cards/'.$cardId;

        $this->withBearer($this->userBearerToken())
            ->patchJson($url, [
                $field => $value,
            ], $this->withIfMatch($this->fetchEtagFromGet($url)))
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
            ], $this->ifMatchFromResponse($create));

        $response->assertOk()
            ->assertJsonPath('name.full', 'Renamed Contact')
            ->assertJsonPath('emails.'.$emailId.'.address', 'keep@example.com')
            ->assertJsonPath('phones.'.$phoneId.'.number', '+1-555-0199');
    }

    public function test_patch_returns_fresh_etag_and_updated_timestamp(): void
    {
        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'ETag Test Contact'],
            ]);

        $create->assertCreated();
        $cardId = (string) $create->json('id');
        $createEtag = (string) $create->json('etag');
        $createUpdated = (string) $create->json('updated');

        $this->assertNotEmpty($createEtag, 'Create response must include etag');
        $this->assertNotEmpty($createUpdated, 'Create response must include updated');

        // Ensure at least 1 second passes so lastmodified differs
        sleep(1);

        $patch = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                'name' => ['full' => 'ETag Test Contact Renamed'],
            ], $this->ifMatchFromResponse($create));

        $patch->assertOk();

        $patchEtag = (string) $patch->json('etag');
        $patchUpdated = (string) $patch->json('updated');

        $this->assertNotEmpty($patchEtag, 'Patch response must include etag');
        $this->assertNotSame($createEtag, $patchEtag, 'etag must change after PATCH');

        $this->assertNotEmpty($patchUpdated, 'Patch response must include updated');
        $this->assertGreaterThan(
            strtotime($createUpdated),
            strtotime($patchUpdated),
            'updated timestamp must advance after PATCH',
        );

        // Subsequent patch must accept the new etag from the previous patch response
        $patch2 = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$cardId, [
                'name' => ['full' => 'ETag Test Contact Final'],
            ], $this->withIfMatch($patchEtag));

        $patch2->assertOk()
            ->assertJsonPath('name.full', 'ETag Test Contact Final');
    }

    public function test_put_returns_fresh_etag_and_updated_timestamp(): void
    {
        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', [
                'addressBookIds' => ['default' => true],
                'name' => ['full' => 'PUT ETag Contact'],
                'emails' => [
                    '550e8400-e29b-41d4-a716-446655440020' => ['address' => 'put@example.com'],
                ],
            ]);

        $create->assertCreated();
        $cardId = (string) $create->json('id');
        $createEtag = (string) $create->json('etag');
        $createUpdated = (string) $create->json('updated');

        $this->assertNotEmpty($createEtag, 'Create response must include etag');
        $this->assertNotEmpty($createUpdated, 'Create response must include updated');

        sleep(1);

        $putBody = $this->contactCardCreatePayloadFromResponse((array) $create->json());
        $putBody['name'] = ['full' => 'PUT ETag Contact Updated'];

        $put = $this->withBearer($this->userBearerToken())
            ->putJson('/api/v1/contacts/cards/'.$cardId, $putBody, $this->ifMatchFromResponse($create));

        $put->assertOk();

        $putEtag = (string) $put->json('etag');
        $putUpdated = (string) $put->json('updated');

        $this->assertNotEmpty($putEtag, 'PUT response must include etag');
        $this->assertNotSame($createEtag, $putEtag, 'etag must change after PUT');

        $this->assertNotEmpty($putUpdated, 'PUT response must include updated');
        $this->assertGreaterThan(
            strtotime($createUpdated),
            strtotime($putUpdated),
            'updated timestamp must advance after PUT',
        );
    }

    public function test_patch_vcard_with_existing_rev_returns_fresh_updated(): void
    {
        // Seed a card that already has a REV property (e.g. from an external CalDAV client)
        $oldRev = '20200101T000000Z';
        $vcard = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:urn:uuid:rev-test-001\r\nFN:REV Test\r\nREV:{$oldRev}\r\nEND:VCARD\r\n";
        $cardId = $this->seedCardViaPdo('bob', 'rev-test.vcf', $vcard);

        $url = '/api/v1/contacts/cards/'.$cardId;
        $etag = $this->fetchEtagFromGet($url);

        // The existing card's updated should not be the old REV value — it must come from DB lastmodified
        $show = $this->withBearer($this->userBearerToken())->getJson($url);
        $show->assertOk();
        $this->assertNotSame(
            '2020-01-01T00:00:00Z',
            $show->json('updated'),
            'updated must reflect DB lastmodified, not a stale vCard REV',
        );

        sleep(1);

        $patch = $this->withBearer($this->userBearerToken())
            ->patchJson($url, [
                'name' => ['full' => 'REV Test Patched'],
            ], $this->withIfMatch($etag));

        $patch->assertOk();

        $patchUpdated = (string) $patch->json('updated');
        $this->assertNotSame(
            '2020-01-01T00:00:00Z',
            $patchUpdated,
            'updated must not return the stale vCard REV after PATCH',
        );
        // updated after patch must be later than what was stored before
        $this->assertGreaterThan(
            strtotime($show->json('updated')),
            strtotime($patchUpdated),
            'updated must advance after PATCH even when vCard had a legacy REV',
        );
    }
}
