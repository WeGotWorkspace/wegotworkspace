<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsCardImportTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_import_multi_vcard_file_creates_all_contacts(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:11111111-1111-4111-8111-111111111111
EMAIL:jane@example.com
END:VCARD
BEGIN:VCARD
VERSION:4.0
FN:Joe Example
UID:urn:uuid:22222222-2222-4222-8222-222222222222
EMAIL:joe@example.com
END:VCARD
VCARD;

        $response = $this->call(
            'POST',
            '/api/v1/contacts/cards/import?addressBookId=default',
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$this->userBearerToken(),
                'CONTENT_TYPE' => 'text/vcard',
                'HTTP_ACCEPT' => 'application/json',
            ],
            $vcard,
        );

        $response->assertCreated()
            ->assertJsonCount(2, 'list')
            ->assertJsonCount(0, 'errors')
            ->assertJsonPath('list.0.name.full', 'Jane Doe')
            ->assertJsonPath('list.1.name.full', 'Joe Example');
    }

    public function test_import_group_after_members_creates_group_with_member_card_ids(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
UID:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Joe Example
UID:07d442ce-49b5-4a59-bc01-d75b17b92c9a
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:07d442ce-49b5-4a59-bc01-d75b17b92c9a
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $response = $this->call(
            'POST',
            '/api/v1/contacts/cards/import?addressBookId=default',
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$this->userBearerToken(),
                'CONTENT_TYPE' => 'text/vcard',
                'HTTP_ACCEPT' => 'application/json',
            ],
            $vcard,
        );

        $response->assertCreated()
            ->assertJsonCount(3, 'list')
            ->assertJsonCount(0, 'errors');

        $group = collect($response->json('list'))
            ->first(fn (array $card): bool => ($card['kind'] ?? null) === 'group');

        $this->assertIsArray($group);
        $this->assertSame('Friends', $group['name']['full'] ?? null);
        $this->assertArrayHasKey('memberCardIds', $group);
    }

    public function test_import_empty_body_returns_bad_request(): void
    {
        $this->call(
            'POST',
            '/api/v1/contacts/cards/import?addressBookId=default',
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$this->userBearerToken(),
                'CONTENT_TYPE' => 'text/vcard',
                'HTTP_ACCEPT' => 'application/json',
            ],
            '',
        )
            ->assertStatus(400);
    }
}
