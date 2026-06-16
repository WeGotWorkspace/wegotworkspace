<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\OptimisticConcurrencyTestHelpers;
use Tests\Support\WgwDatabaseTestCase;

final class ContactsCardsSyncTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;
    use OptimisticConcurrencyTestHelpers;

    private const TEST_UID = 'urn:uuid:550e8400-e29b-41d4-a716-446655440099';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_card_changes_reports_create_and_delete(): void
    {
        $initial = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/changes?addressBookId=default')
            ->assertOk();

        $state = $initial->json('newState');
        $this->assertNotSame('', (string) $state);

        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload(),
                [
                    'uid' => self::TEST_UID,
                    'name' => ['full' => 'Sync Test'],
                ],
            ))
            ->assertCreated();

        $cardId = $create->json('id');
        $cardUrl = '/api/v1/contacts/cards/'.$cardId;

        $afterCreate = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/changes?addressBookId=default&since='.$state)
            ->assertOk();

        $afterCreate->assertJsonPath('created.0', $cardId);
        $newState = $afterCreate->json('newState');

        $this->withBearer($this->userBearerToken())
            ->deleteJson($cardUrl, [], $this->withIfMatch($this->fetchEtagFromGet($cardUrl)))
            ->assertOk();

        $afterDelete = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/changes?addressBookId=default&since='.$newState)
            ->assertOk();

        $afterDelete->assertJsonPath('destroyed.0', $cardId);
    }

    public function test_query_by_uid_returns_matching_card_id(): void
    {
        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload(),
                [
                    'uid' => self::TEST_UID,
                    'name' => ['full' => 'Query Target'],
                ],
            ))
            ->assertCreated();

        $cardId = $create->json('id');

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards/query', [
                'filter' => [
                    'inAddressBook' => 'default',
                    'uid' => self::TEST_UID,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('ids.0', $cardId)
            ->assertJsonPath('total', 1);
    }

    public function test_query_total_counts_matches_before_limit(): void
    {
        $uid = 'urn:uuid:550e8400-e29b-41d4-a716-4466554400aa';

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload(),
                [
                    'uid' => $uid,
                    'name' => ['full' => 'First Limited Match'],
                ],
            ))
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload(),
                [
                    'uid' => $uid,
                    'name' => ['full' => 'Second Limited Match'],
                ],
            ))
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards/query', [
                'filter' => [
                    'inAddressBook' => 'default',
                    'uid' => $uid,
                ],
                'limit' => 1,
            ])
            ->assertOk()
            ->assertJsonCount(1, 'ids')
            ->assertJsonPath('total', 2);
    }

    public function test_list_cards_supports_uid_query_parameter(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', array_merge(
                $this->sampleContactCardPayload(),
                [
                    'uid' => self::TEST_UID,
                    'name' => ['full' => 'List Filter'],
                ],
            ))
            ->assertCreated();

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards?addressBookId=default&uid='.urlencode(self::TEST_UID));

        $response->assertOk();
        $this->assertCount(1, $response->json('list'));
        $this->assertSame(self::TEST_UID, $response->json('list.0.uid'));
    }

    public function test_address_book_changes_reports_created_book(): void
    {
        $initial = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks/changes')
            ->assertOk();

        $state = $initial->json('newState');

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/addressbooks', [
                'name' => 'Sync book',
                'id' => 'sync-book',
            ])
            ->assertCreated();

        $changes = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/addressbooks/changes?since='.$state)
            ->assertOk();

        $changes->assertJsonPath('created.0', 'sync-book');
    }
}
