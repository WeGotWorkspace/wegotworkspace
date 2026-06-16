<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use App\Models\Addressbook;
use App\Models\Card;
use Tests\Support\ContactsTestFixtures;
use Tests\Support\OptimisticConcurrencyTestHelpers;
use Tests\Support\WgwDatabaseTestCase;

final class ContactGroupMembersTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;
    use OptimisticConcurrencyTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpContactsFixtures();
    }

    public function test_apple_style_group_members_resolve_to_member_card_ids(): void
    {
        $janeUid = 'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f';
        $joeUid = '07d442ce-49b5-4a59-bc01-d75b17b92c9a';

        $janeId = $this->seedCardViaPdo('bob', 'jane-doe.vcf', <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
UID:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
END:VCARD
VCARD);

        $joeId = $this->seedCardViaPdo('bob', 'joe-example.vcf', <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Joe Example
UID:07d442ce-49b5-4a59-bc01-d75b17b92c9a
END:VCARD
VCARD);

        $groupId = $this->seedCardViaPdo('bob', 'friends-group.vcf', <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:07d442ce-49b5-4a59-bc01-d75b17b92c9a
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD);

        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$groupId)
            ->assertOk();

        $response->assertJsonPath('kind', 'group');
        $response->assertJsonPath('memberCardIds.urn:uuid:'.$janeUid, $janeId);
        $response->assertJsonPath('memberCardIds.urn:uuid:'.$joeUid, $joeId);
    }

    public function test_patch_group_name_updates_vcard_fn_and_n(): void
    {
        $groupId = $this->seedCardViaPdo('bob', 'friends-group.vcf', <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//AddressBookCore 1.0//EN
N:Friends;;;;
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD);

        $show = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/contacts/cards/'.$groupId)
            ->assertOk()
            ->assertJsonPath('name.full', 'Friends');

        $patch = $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/contacts/cards/'.$groupId, [
                'name' => [
                    '@type' => 'Name',
                    'isOrdered' => false,
                    'full' => 'Close Friends',
                ],
            ], $this->ifMatchFromResponse($show));

        $patch->assertOk()
            ->assertJsonPath('name.full', 'Close Friends');

        $stored = $this->findBobCard($groupId);
        $this->assertNotNull($stored);
        $raw = is_string($stored->carddata) ? $stored->carddata : (string) $stored->carddata;
        $this->assertStringContainsString('FN:Close Friends', $raw);
        $this->assertStringContainsString('N:Close Friends', $raw);
        $this->assertStringNotContainsString('FN:Friends', $raw);
        $this->assertStringNotContainsString('N:Friends', $raw);
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
}
