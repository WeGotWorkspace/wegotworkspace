<?php

declare(strict_types=1);

namespace Tests\Feature\Contacts;

use Tests\Support\ContactsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class ContactGroupMembersTest extends WgwDatabaseTestCase
{
    use ContactsTestFixtures;

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
}
