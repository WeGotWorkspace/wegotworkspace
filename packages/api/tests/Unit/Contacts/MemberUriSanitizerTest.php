<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\MemberUriSanitizer;
use PHPUnit\Framework\TestCase;

final class MemberUriSanitizerTest extends TestCase
{
    public function test_sanitize_rewrites_macos_corrupt_member_uris(): void
    {
        $janeUid = 'c4cf6038-5da0-41be-9c2d-d8cb9b4af90f';
        $joeUid = '07d442ce-49b5-4a59-bc01-d75b17b92c9a';
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:"urn:uuid:{$janeUid}"
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:"urn:uuid:{$joeUid}"
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $result = (new MemberUriSanitizer)->sanitize($vcard);

        $this->assertTrue($result['changed']);
        $this->assertStringContainsString('X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'.$janeUid, $result['vcard']);
        $this->assertStringContainsString('X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'.$joeUid, $result['vcard']);
        $this->assertStringNotContainsString('"urn:uuid:', $result['vcard']);
    }

    public function test_sanitize_is_noop_for_well_formed_member_uris(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:3.0
FN:Friends
X-ADDRESSBOOKSERVER-KIND:group
X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:c4cf6038-5da0-41be-9c2d-d8cb9b4af90f
UID:08430ef3-a2ce-4568-9d6c-f50a6cfd32ae
END:VCARD
VCARD;

        $result = (new MemberUriSanitizer)->sanitize($vcard);

        $this->assertFalse($result['changed']);
        $this->assertSame($vcard, $result['vcard']);
    }
}
