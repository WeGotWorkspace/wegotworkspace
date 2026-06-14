<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\PropIdEnsurer;
use PHPUnit\Framework\TestCase;

final class PropIdEnsurerTest extends TestCase
{
    private PropIdEnsurer $ensurer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensurer = new PropIdEnsurer;
    }

    public function test_adds_prop_id_to_multivalue_properties(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Legacy
UID:urn:uuid:33333333-3333-4333-8333-333333333333
EMAIL:one@example.com
EMAIL:two@example.com
END:VCARD
VCARD;

        $result = $this->ensurer->ensure($vcard);

        $this->assertTrue($result['changed']);
        $this->assertStringContainsString('PROP-ID=', $result['vcard']);
        preg_match_all('/PROP-ID=([^;:]+)/', $result['vcard'], $matches);
        $this->assertCount(2, $matches[1]);
        $this->assertNotSame($matches[1][0], $matches[1][1]);
    }

    public function test_preserves_existing_prop_ids(): void
    {
        $existing = '44444444-4444-4444-8444-444444444444';
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
FN:Has Prop Id
UID:urn:uuid:34343434-3434-4434-8434-343434343434
EMAIL;PROP-ID={$existing}:stable@example.com
END:VCARD
VCARD;

        $result = $this->ensurer->ensure($vcard);

        $this->assertFalse($result['changed']);
        $this->assertStringContainsString('PROP-ID='.$existing, $result['vcard']);
    }

    public function test_only_adds_missing_prop_ids(): void
    {
        $existing = '55555555-5555-4555-8555-555555555555';
        $vcard = <<<VCARD
BEGIN:VCARD
VERSION:4.0
FN:Mixed
UID:urn:uuid:35353535-3535-4535-8535-353535353535
EMAIL;PROP-ID={$existing}:kept@example.com
EMAIL:new@example.com
END:VCARD
VCARD;

        $result = $this->ensurer->ensure($vcard);

        $this->assertTrue($result['changed']);
        $this->assertStringContainsString('PROP-ID='.$existing, $result['vcard']);
        preg_match_all('/PROP-ID=([^;:]+)/', $result['vcard'], $matches);
        $this->assertCount(2, $matches[1]);
        $this->assertContains($existing, $matches[1]);
    }
}
