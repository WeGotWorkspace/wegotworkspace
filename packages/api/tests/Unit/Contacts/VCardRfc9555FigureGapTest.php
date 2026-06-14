<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\Conversion\VCardJsContactConverter;
use PHPUnit\Framework\TestCase;

/**
 * RFC 9555 figure coverage gap audit (Fastmail Text::JSContact vs WGW fixtures).
 *
 * Fastmail `t/rfc9555.t` (CPAN Text-JSContact-0.01) exercises RFC figures
 * 7–14, 16–26, 28, 32–36. It does **not** include normative examples for:
 *
 * - Figure 15 — ADR (WGW: `address-rfc9554` golden)
 * - Figure 27 — TITLE + ROLE with grouped ORG (WGW: `organization`, `organizational-ext`)
 * - Figure 29 — HOBBY (WGW: `personal-info` golden)
 * - Figure 30 — INTEREST (WGW: `personal-info` golden)
 * - Figure 31 — ORG-DIRECTORY (WGW: `organizational-ext` golden)
 *
 * WGW's 27 golden pairs + `VCardJsContactConverterTest::matrixPropertyRowProvider`
 * cover all properties exercised by Fastmail's rfc9555.t. The tests below port the
 * three Fastmail-missing figures that are most commonly hit in real CardDAV exports.
 *
 * @see packages/api/tests/fixtures/README.md
 * @see packages/api/docs/contacts/rfc9555-conversion-matrix.md
 */
final class VCardRfc9555FigureGapTest extends TestCase
{
    private VCardJsContactConverter $converter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new VCardJsContactConverter;
    }

    public function test_rfc9555_figure_15_adr_converts_components(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
ADR;TYPE=work;CC=US:;;54321 Oak St;Reston;VA;20190;USA
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);
        $address = reset($card['addresses']);
        $this->assertIsArray($address);
        $this->assertSame(['work' => true], $address['contexts'] ?? null);
        $this->assertSame('US', $address['countryCode'] ?? null);

        $byKind = [];
        foreach ($address['components'] ?? [] as $component) {
            $byKind[(string) ($component['kind'] ?? '')] = (string) ($component['value'] ?? '');
        }
        $this->assertSame('54321 Oak St', $byKind['name'] ?? null);
        $this->assertSame('Reston', $byKind['locality'] ?? null);
        $this->assertSame('VA', $byKind['region'] ?? null);
        $this->assertSame('20190', $byKind['postcode'] ?? null);
        $this->assertSame('USA', $byKind['country'] ?? null);
    }

    public function test_rfc9555_figure_27_title_and_role_convert(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
TITLE:Research Scientist
group1.ROLE:Project Leader
group1.ORG:ABC, Inc.
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $kinds = [];
        foreach ($card['titles'] ?? [] as $title) {
            $this->assertIsArray($title);
            $kinds[(string) ($title['kind'] ?? '')] = (string) ($title['name'] ?? '');
        }
        $this->assertSame('Research Scientist', $kinds['title'] ?? null);
        $this->assertSame('Project Leader', $kinds['role'] ?? null);
    }

    public function test_rfc9555_figure_29_hobby_converts_to_personal_info(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:cccccccc-cccc-4ccc-8ccc-cccccccccccc
HOBBY;INDEX=2:Reading
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $hobby = null;
        foreach ($card['personalInfo'] ?? [] as $entry) {
            if (is_array($entry) && ($entry['kind'] ?? '') === 'hobby') {
                $hobby = $entry;
                break;
            }
        }
        $this->assertIsArray($hobby);
        $this->assertSame('Reading', $hobby['value'] ?? null);
        $this->assertSame(2, $hobby['listAs'] ?? null);
    }
}
