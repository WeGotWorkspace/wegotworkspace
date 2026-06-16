<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\Conversion\ConversionSupport;
use App\Services\Contacts\Conversion\VCardJsContactConverter;
use PHPUnit\Framework\TestCase;

final class ContactMemberResolverTest extends TestCase
{
    public function test_normalize_contact_uid_matches_apple_member_and_card_formats(): void
    {
        $this->assertSame(
            'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f',
            ConversionSupport::normalizeContactUidForMatch('urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f'),
        );
        $this->assertSame(
            'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f',
            ConversionSupport::normalizeContactUidForMatch('c4cf6038-5da0-41be-9c2d-d8cb9b4af90f'),
        );
    }

    public function test_normalize_member_uid_repairs_macos_addressbook_corrupt_format(): void
    {
        $uuid = '9b32e421-5da0-41be-9c2d-d8cb9b4af90f';

        $this->assertSame(
            'urn:uuid:'.$uuid,
            ConversionSupport::normalizeMemberUid('urn:uuid:"urn:uuid:'.$uuid.'"'),
        );
        $this->assertSame(
            'urn:uuid:'.$uuid,
            ConversionSupport::normalizeMemberUid('urn:uuid:urn:uuid:'.$uuid),
        );
        $this->assertSame(
            'urn:uuid:'.$uuid,
            ConversionSupport::normalizeMemberUid('"'.$uuid.'"'),
        );
        $this->assertSame(
            $uuid,
            ConversionSupport::normalizeContactUidForMatch('urn:uuid:"urn:uuid:'.$uuid.'"'),
        );
    }

    public function test_apple_group_members_resolve_when_card_uid_omits_urn_prefix(): void
    {
        $converter = new VCardJsContactConverter;
        $groupVcard = <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:07d442ce-49b5-4a59-bc01-d75b17b92c9a
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $group = $converter->cardFromVCard($groupVcard);
        $memberUid = 'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f';
        $memberKey = 'urn:uuid:'.$memberUid;

        $this->assertArrayHasKey($memberKey, $group['members']);

        $normalizedMember = ConversionSupport::normalizeContactUidForMatch($memberKey);
        $normalizedCard = ConversionSupport::normalizeContactUidForMatch($memberUid);
        $this->assertSame($normalizedMember, $normalizedCard);
    }

    public function test_macos_corrupt_group_members_parse_to_canonical_member_uids(): void
    {
        $janeUid = 'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f';
        $joeUid = '07d442ce-49b5-4a59-bc01-d75b17b92c9a';
        $converter = new VCardJsContactConverter;
        $groupVcard = <<<VCARD
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:"urn:uuid:{$janeUid}"
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:"urn:uuid:{$joeUid}"
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $group = $converter->cardFromVCard($groupVcard);

        $this->assertArrayHasKey('urn:uuid:'.$janeUid, $group['members']);
        $this->assertArrayHasKey('urn:uuid:'.$joeUid, $group['members']);
        $this->assertCount(2, $group['members']);
    }
}
