<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\Conversion\VCardJsContactConverter;
use PHPUnit\Framework\TestCase;

/** Covers GitHub issues #151–#156 acceptance criteria. */
final class ContactsIssueGapTest extends TestCase
{
    private VCardJsContactConverter $converter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new VCardJsContactConverter;
    }

    public function test_localizations_from_fn_language_round_trip(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:John Smith
FN;LANGUAGE=fr:Jean Dupont
UID:urn:uuid:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);
        $this->assertSame('John Smith', $card['name']['full']);
        $this->assertSame('Jean Dupont', $card['localizations']['fr']['name/full']);

        $roundTripped = $this->converter->cardFromVCard($this->converter->vCardFromCard($card));
        $this->assertSame('Jean Dupont', $roundTripped['localizations']['fr']['name/full']);
    }

    public function test_jscopms_ordered_address_round_trip(): void
    {
        $card = [
            '@type' => 'Card',
            'version' => '1.0',
            'uid' => 'urn:uuid:dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            'name' => ['@type' => 'Name', 'full' => 'Jane Doe'],
            'addresses' => [
                'addr-1' => [
                    '@type' => 'Address',
                    'isOrdered' => true,
                    'components' => [
                        ['@type' => 'AddressComponent', 'kind' => 'number', 'value' => '54321'],
                        ['@type' => 'AddressComponent', 'kind' => 'separator', 'value' => ' '],
                        ['@type' => 'AddressComponent', 'kind' => 'name', 'value' => 'Oak St'],
                        ['@type' => 'AddressComponent', 'kind' => 'locality', 'value' => 'Reston'],
                    ],
                    'defaultSeparator' => ', ',
                ],
            ],
        ];

        $vcard = $this->converter->vCardFromCard($card);
        $this->assertStringContainsStringIgnoringCase('JSCOMPS', $vcard);
        $roundTripped = $this->converter->cardFromVCard($vcard);
        $address = reset($roundTripped['addresses']);
        $this->assertIsArray($address);
        $this->assertTrue($address['isOrdered'] ?? false);
    }

    public function test_geo_tz_adr_merge_into_single_address(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents(
            dirname(__DIR__, 2).'/fixtures/Contacts/geo-tz.vcf',
        ));

        $merged = null;
        foreach ($card['addresses'] ?? [] as $address) {
            if (! is_array($address)) {
                continue;
            }
            if (isset($address['coordinates'], $address['components'], $address['timeZone'])
                && ($address['timeZone'] ?? '') === 'Europe/Amsterdam') {
                $merged = $address;
            }
        }

        $this->assertIsArray($merged);
        $this->assertSame('geo:40.7128,-74.0060', $merged['coordinates'] ?? null);
        $this->assertCount(2, $card['addresses']);
    }

    public function test_group_members_preserve_missing_uids(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
KIND:group
FN:Nested Group
UID:urn:uuid:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
MEMBER:urn:uuid:11111111-1111-4111-8111-111111111111
MEMBER:urn:uuid:missing-member-uid
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);
        $this->assertSame([
            'urn:uuid:11111111-1111-4111-8111-111111111111' => true,
            'urn:uuid:missing-member-uid' => true,
        ], $card['members']);

        $roundTripped = $this->converter->cardFromVCard($this->converter->vCardFromCard($card));
        $this->assertSame($card['members'], $roundTripped['members']);
    }

    public function test_apple_addressbookserver_group_converts_to_kind_and_members(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//AddressBookCore 1.0//EN
N:Friends;;;;
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:07d442ce-49b5-4a59-bc01-d75b17b92c9a
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertSame('group', $card['kind']);
        $this->assertSame([
            'urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f' => true,
            'urn:uuid:07d442ce-49b5-4a59-bc01-d75b17b92c9a' => true,
        ], $card['members']);

        $propNames = array_map(
            static fn (array $tuple): string => (string) $tuple[0],
            $card['vCardProps'] ?? [],
        );
        $this->assertNotContains('X-ADDRESSBOOKSERVER-KIND', $propNames);
        $this->assertNotContains('X-ADDRESSBOOKSERVER-MEMBER', $propNames);
    }

    public function test_multiple_fn_without_language_preserved_in_vcard_props(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Primary Name
FN:Alternate Name
UID:urn:uuid:cccccccc-cccc-4ccc-8ccc-cccccccccccc
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);
        $this->assertSame('Primary Name', $card['name']['full']);
        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('FN', $names);
    }
}
