<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use App\Models\Addressbook;
use App\Models\Card;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

/**
 * CardDAV ↔ REST round-trip interoperability for the contacts domain.
 */
final class ContactsCardDavInteropTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_rest_create_persists_readable_vcard_in_carddav_storage(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $payload = [
            '@type' => 'Card',
            'version' => '1.0',
            'uid' => $uid,
            'addressBookIds' => ['default' => true],
            'name' => ['full' => 'Interoperable Contact'],
            'emails' => [
                'email-1' => [
                    '@type' => 'EmailAddress',
                    'address' => 'interop@test.example',
                ],
            ],
        ];

        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', $payload);

        $response->assertCreated();
        $cardId = (string) $response->json('id');
        $this->assertNotSame('', $cardId);

        $stored = $this->findBobCard($cardId);
        $this->assertNotNull($stored, 'REST-created card should exist in CardDAV cards table.');

        $vcard = is_string($stored->carddata) ? $stored->carddata : (string) $stored->carddata;
        $this->assertStringContainsString('FN:Interoperable Contact', $vcard);
        $this->assertStringContainsString('UID:'.$uid, $vcard);
        $this->assertStringContainsString('interop@test.example', $vcard);
        $this->assertSame(
            $stored->uri,
            str_ends_with($cardId, '.vcf') ? $cardId : $cardId.'.vcf',
            'Card URI should match REST card id with .vcf suffix.',
        );
    }

    public function test_rest_create_updates_carddav_search_index(): void
    {
        $payload = [
            '@type' => 'Card',
            'version' => '1.0',
            'uid' => 'urn:uuid:'.Str::uuid()->toString(),
            'addressBookIds' => ['default' => true],
            'name' => ['full' => 'Searchable Interop Contact'],
            'emails' => [
                'email-1' => [
                    '@type' => 'EmailAddress',
                    'address' => 'searchinterop@example.com',
                ],
            ],
        ];

        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/contacts/cards', $payload);

        $response->assertCreated();
        $cardId = (string) $response->json('id');
        $stored = $this->findBobCard($cardId);
        $this->assertNotNull($stored);

        $sourceKey = $this->cardDavSearchSourceKey('bob', 'default', (string) $stored->uri);
        $row = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'carddav')
            ->where('source_key', $sourceKey)
            ->first();

        $this->assertNotNull($row, 'REST create should index the CardDAV contact.');
        $this->assertSame('contact', $row->category);
        $this->assertSame('bob', $row->owner_username);
        $this->assertStringContainsString('Searchable Interop Contact', (string) $row->title);
        $this->assertStringContainsString('searchinterop@example.com', (string) $row->body_text);

        $search = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/search/results?'.http_build_query([
                'q' => 'searchinterop',
                'sources' => ['carddav'],
                'limit' => 10,
            ]));

        $search->assertOk();
        $sourceTypes = array_map(
            static fn (array $hit): string => (string) ($hit['sourceType'] ?? ''),
            $search->json('data.results') ?? [],
        );
        $this->assertContains('carddav', $sourceTypes);
    }

    public function test_carddav_write_is_readable_via_rest_get(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $vcard = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:{$uid}\r\nFN:CardDAV Writer\r\nN:Writer;CardDAV;;;\r\nEMAIL:carddav-writer@example.com\r\nEND:VCARD\r\n";

        $cardId = $this->seedCardViaPdo('bob', 'carddav-writer.vcf', $vcard);

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId);

        $response->assertOk()
            ->assertJsonPath('id', $cardId)
            ->assertJsonPath('@type', 'Card')
            ->assertJsonPath('version', '1.0')
            ->assertJsonPath('uid', $uid)
            ->assertJsonPath('addressBookIds.default', true)
            ->assertJsonPath('name.full', 'CardDAV Writer');

        $emails = $response->json('emails');
        $this->assertIsArray($emails);
        $addresses = array_map(
            static fn (array $entry): string => (string) ($entry['address'] ?? ''),
            array_values($emails),
        );
        $this->assertContains('carddav-writer@example.com', $addresses);
    }

    public function test_carddav_update_is_reflected_in_rest_get(): void
    {
        $uid = 'urn:uuid:'.Str::uuid()->toString();
        $initial = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:{$uid}\r\nFN:Before Update\r\nEMAIL:before@example.com\r\nEND:VCARD\r\n";
        $cardId = $this->seedCardViaPdo('bob', 'round-trip-update.vcf', $initial);

        $updated = "BEGIN:VCARD\r\nVERSION:4.0\r\nUID:{$uid}\r\nFN:After CardDAV Update\r\nEMAIL:after@example.com\r\nEND:VCARD\r\n";
        $this->updateCardViaPdo('bob', 'round-trip-update.vcf', $updated);

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$cardId);

        $response->assertOk()
            ->assertJsonPath('name.full', 'After CardDAV Update');

        $emails = $response->json('emails');
        $this->assertIsArray($emails);
        $addresses = array_map(
            static fn (array $entry): string => (string) ($entry['address'] ?? ''),
            array_values($emails),
        );
        $this->assertContains('after@example.com', $addresses);
        $this->assertNotContains('before@example.com', $addresses);
    }

    private function findBobCard(string $cardId): ?Card
    {
        $cardUri = str_ends_with($cardId, '.vcf') ? $cardId : $cardId.'.vcf';
        $bookIds = Addressbook::query()
            ->where('principaluri', 'principals/bob')
            ->pluck('id');

        return Card::query()
            ->whereIn('addressbookid', $bookIds)
            ->where(function ($query) use ($cardId, $cardUri): void {
                $query->where('uri', $cardId)
                    ->orWhere('uri', $cardUri);
            })
            ->first();
    }

    private function cardDavSearchSourceKey(string $username, string $bookUri, string $cardUri): string
    {
        return $username.'|'.$bookUri.'|'.$cardUri;
    }
}
