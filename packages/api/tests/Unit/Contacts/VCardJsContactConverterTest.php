<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\Conversion\VCardJsContactConverter;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class VCardJsContactConverterTest extends TestCase
{
    private VCardJsContactConverter $converter;

    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new VCardJsContactConverter;
        $this->fixturesDir = dirname(__DIR__, 2).'/fixtures/Contacts';
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function goldenFixtureProvider(): array
    {
        $fixtures = [];
        foreach (glob(dirname(__DIR__, 2).'/fixtures/Contacts/*.vcf') ?: [] as $path) {
            $name = basename($path, '.vcf');
            $fixtures[$name] = [$name];
        }

        return $fixtures;
    }

    #[DataProvider('goldenFixtureProvider')]
    public function test_vcard_to_jscontact_matches_golden_fixture(string $fixture): void
    {
        $vcard = file_get_contents("{$this->fixturesDir}/{$fixture}.vcf");
        $expected = json_decode((string) file_get_contents("{$this->fixturesDir}/{$fixture}.json"), true);

        $actual = $this->converter->cardFromVCard((string) $vcard);

        $this->assertSame($expected, $actual);
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function reversibleFixtureProvider(): array
    {
        $reversible = [
            'fn-only',
            'structured-name',
            'emails',
            'address-legacy',
            'address-rfc9554',
            'organization',
            'note',
            'photo-uri',
            'uid-metadata',
            'categories',
            'group',
            'multi-value',
            'full-contact',
            'anniversaries',
            'speak-to-as',
            'online-services',
            'languages',
            'geo-tz',
            'organizational-ext',
            'personal-info',
            'security-calendaring',
            'links-media',
            'kind-individual',
            'tel-features',
        ];
        $fixtures = [];
        foreach ($reversible as $name) {
            $fixtures[$name] = [$name];
        }

        return $fixtures;
    }

    /**
     * RFC 9555 matrix vCard property rows → golden fixture that exercises the mapping.
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function matrixPropertyRowProvider(): array
    {
        return [
            'KIND' => ['KIND', 'kind-individual'],
            'SOURCE' => ['SOURCE', 'organizational-ext'],
            'XML' => ['XML', 'preserve-only'],
            'FN' => ['FN', 'fn-only'],
            'N' => ['N', 'structured-name'],
            'NICKNAME' => ['NICKNAME', 'multi-value'],
            'PHOTO' => ['PHOTO', 'photo-uri'],
            'GENDER' => ['GENDER', 'preserve-only'],
            'GRAMGENDER' => ['GRAMGENDER', 'speak-to-as'],
            'PRONOUNS' => ['PRONOUNS', 'speak-to-as'],
            'BDAY' => ['BDAY', 'anniversaries'],
            'BIRTHPLACE' => ['BIRTHPLACE', 'anniversaries'],
            'DEATHDATE' => ['DEATHDATE', 'anniversaries'],
            'DEATHPLACE' => ['DEATHPLACE', 'anniversaries'],
            'ANNIVERSARY' => ['ANNIVERSARY', 'anniversaries'],
            'ADR' => ['ADR', 'address-rfc9554'],
            'EMAIL' => ['EMAIL', 'emails'],
            'TEL' => ['TEL', 'tel-features'],
            'IMPP' => ['IMPP', 'online-services'],
            'LANG' => ['LANG', 'languages'],
            'LANGUAGE' => ['LANGUAGE', 'languages'],
            'SOCIALPROFILE' => ['SOCIALPROFILE', 'online-services'],
            'GEO' => ['GEO', 'geo-tz'],
            'TZ' => ['TZ', 'geo-tz'],
            'ORG' => ['ORG', 'organization'],
            'TITLE' => ['TITLE', 'full-contact'],
            'ROLE' => ['ROLE', 'organizational-ext'],
            'MEMBER' => ['MEMBER', 'group'],
            'RELATED' => ['RELATED', 'organizational-ext'],
            'CONTACT-URI' => ['CONTACT-URI', 'organizational-ext'],
            'LOGO' => ['LOGO', 'organizational-ext'],
            'EXPERTISE' => ['EXPERTISE', 'personal-info'],
            'HOBBY' => ['HOBBY', 'personal-info'],
            'INTEREST' => ['INTEREST', 'personal-info'],
            'ORG-DIRECTORY' => ['ORG-DIRECTORY', 'organizational-ext'],
            'CATEGORIES' => ['CATEGORIES', 'categories'],
            'NOTE' => ['NOTE', 'note'],
            'PRODID' => ['PRODID', 'uid-metadata'],
            'CREATED' => ['CREATED', 'uid-metadata'],
            'REV' => ['REV', 'uid-metadata'],
            'SOUND' => ['SOUND', 'links-media'],
            'UID' => ['UID', 'fn-only'],
            'URL' => ['URL', 'links-media'],
            'VERSION' => ['VERSION', 'fn-only'],
            'CLIENTPIDMAP' => ['CLIENTPIDMAP', 'preserve-only'],
            'X-ABLabel' => ['X-ABLabel', 'multi-value'],
            'KEY' => ['KEY', 'security-calendaring'],
            'CALADRURI' => ['CALADRURI', 'security-calendaring'],
            'CALURI' => ['CALURI', 'security-calendaring'],
            'FBURL' => ['FBURL', 'security-calendaring'],
            'X-*' => ['X-CUSTOM-PROP', 'x-custom'],
        ];
    }

    #[DataProvider('matrixPropertyRowProvider')]
    public function test_matrix_property_row_is_covered_by_fixture(string $property, string $fixture): void
    {
        $vcard = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.vcf");
        $this->assertStringContainsStringIgnoringCase($property, $vcard, "Fixture {$fixture} should contain {$property}");

        $expected = json_decode((string) file_get_contents("{$this->fixturesDir}/{$fixture}.json"), true);
        $actual = $this->converter->cardFromVCard($vcard);
        $this->assertSame($expected, $actual);
    }

    #[DataProvider('reversibleFixtureProvider')]
    public function test_jscontact_to_vcard_round_trip_preserves_card(string $fixture): void
    {
        $expected = json_decode((string) file_get_contents("{$this->fixturesDir}/{$fixture}.json"), true);
        $vcard = $this->converter->vCardFromCard($expected);
        $roundTripped = $this->converter->cardFromVCard($vcard);

        $this->assertSame($expected, $roundTripped, "Round-trip mismatch for fixture {$fixture}");
    }

    public function test_jscontact_to_vcard_emits_fn_and_uid(): void
    {
        $card = json_decode((string) file_get_contents("{$this->fixturesDir}/fn-only.json"), true);
        $vcard = $this->converter->vCardFromCard($card);

        $this->assertStringContainsString('FN:John Q. Public\\, Esq.', $vcard);
        $this->assertStringContainsString('UID:urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6', $vcard);
        $this->assertStringContainsString('VERSION:4.0', $vcard);
    }

    public function test_derived_fn_when_name_full_missing(): void
    {
        $card = [
            '@type' => 'Card',
            'version' => '1.0',
            'uid' => 'urn:uuid:cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            'name' => [
                '@type' => 'Name',
                'components' => [
                    ['@type' => 'NameComponent', 'kind' => 'given', 'value' => 'Jane'],
                    ['@type' => 'NameComponent', 'kind' => 'surname', 'value' => 'Doe'],
                ],
            ],
        ];

        $vcard = $this->converter->vCardFromCard($card);

        $this->assertStringContainsString('FN;DERIVED=TRUE:Jane Doe', $vcard);
        $this->assertStringContainsString('N:Doe;Jane', $vcard);
    }

    public function test_generates_uid_when_vcard_lacks_uid(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:No UID Contact
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertArrayHasKey('uid', $card);
        $this->assertStringStartsWith('urn:uuid:', (string) $card['uid']);
        $this->assertSame($card['uid'], $this->converter->cardFromVCard($vcard)['uid']);
    }

    public function test_voice_tel_without_explicit_features_is_non_reversible(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Voice Default
UID:urn:uuid:dddddddd-dddd-4ddd-8ddd-dddddddddddd
TEL:tel:+1-555-0100
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);
        $phone = reset($card['phones']);
        $this->assertIsArray($phone);
        $this->assertArrayNotHasKey('features', $phone);

        $roundTripped = $this->converter->cardFromVCard($this->converter->vCardFromCard($card));
        $roundTrippedPhone = reset($roundTripped['phones']);
        $this->assertIsArray($roundTrippedPhone);
        $this->assertArrayNotHasKey('features', $roundTrippedPhone);
    }

    public function test_version_preserved_in_vcard_props(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/fn-only.vcf"));

        $this->assertArrayHasKey('vCardProps', $card);
        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('VERSION', $names);
    }

    public function test_gender_preserved_in_vcard_props(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/preserve-only.vcf"));

        $this->assertArrayNotHasKey('gender', $card);
        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('GENDER', $names);
    }

    public function test_xml_preserved_in_vcard_props(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/preserve-only.vcf"));

        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('XML', $names);
    }

    public function test_clientpidmap_preserved_in_vcard_props(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/preserve-only.vcf"));

        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('CLIENTPIDMAP', $names);
    }

    public function test_x_custom_property_preserved_in_vcard_props(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/x-custom.vcf"));

        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('X-CUSTOM-PROP', $names);
    }

    public function test_derived_fn_skipped_on_read(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN;DERIVED=TRUE:Jane Doe
UID:urn:uuid:cccccccc-cccc-4ccc-8ccc-cccccccccccc
N:Doe;Jane;;;
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertArrayHasKey('name', $card);
        $this->assertArrayNotHasKey('full', $card['name']);
        $this->assertArrayHasKey('components', $card['name']);
    }

    public function test_tz_uri_preserved_in_vcard_props(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:25252525-2525-4252-8252-252525252525
TZ;VALUE=uri:http://example.com/tz/invalid
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('TZ', $names);
    }

    public function test_categories_pref_order_not_preserved(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:26262626-2626-4262-8262-262626262626
CATEGORIES;PREF=1:alpha
CATEGORIES;PREF=2:beta
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertSame(['alpha' => true, 'beta' => true], $card['keywords']);
        $this->assertArrayNotHasKey(0, $card['keywords']);
    }

    public function test_member_pref_not_converted(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
KIND:group
FN:Group
UID:urn:uuid:27272727-2727-4272-8272-272727272727
MEMBER;PREF=1:urn:uuid:11111111-1111-4111-8111-111111111111
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertSame(['urn:uuid:11111111-1111-4111-8111-111111111111' => true], $card['members']);
    }

    public function test_expertise_level_mapping(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/personal-info.vcf"));

        $this->assertSame('low', $card['personalInfo']['EXP-1']['level']);
        $vcard = $this->converter->vCardFromCard($card);
        $this->assertStringContainsStringIgnoringCase('LEVEL=beginner', $vcard);
    }

    public function test_related_text_value_has_empty_relation(): void
    {
        $card = $this->converter->cardFromVCard((string) file_get_contents("{$this->fixturesDir}/organizational-ext.vcf"));

        $this->assertSame([], $card['relatedTo']['My former manager']['relation']);
    }

    public function test_anniversary_month_only_preserved_in_vcard_props(): void
    {
        $vcard = <<<'VCARD'
BEGIN:VCARD
VERSION:4.0
FN:Jane Doe
UID:urn:uuid:28282828-2828-4282-8282-282828282828
BDAY;VALUE=date:--0315
END:VCARD
VCARD;

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertArrayNotHasKey('anniversaries', $card);
        $names = array_map(static fn (array $tuple): string => (string) $tuple[0], $card['vCardProps']);
        $this->assertContains('BDAY', $names);
    }
}
