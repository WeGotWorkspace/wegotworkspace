<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\Conversion\VCardJsContactConverter;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Real-world vCard exports from Audriga's jmap-php-icalendar_vcard test resources.
 *
 * Assert parse success and deterministic round-trip (no exact golden match to Audriga JSON).
 *
 * @see packages/api/tests/fixtures/README.md
 */
final class VCardAudrigaInteropTest extends TestCase
{
    private VCardJsContactConverter $converter;

    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->converter = new VCardJsContactConverter;
        $this->fixturesDir = dirname(__DIR__, 2).'/fixtures/Contacts/Interop/audriga';
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function audrigaFixtureProvider(): array
    {
        $dir = dirname(__DIR__, 2).'/fixtures/Contacts/Interop/audriga';
        $fixtures = [];
        foreach (glob($dir.'/*.vcf') ?: [] as $path) {
            $name = basename($path, '.vcf');
            $fixtures[$name] = [$name];
        }

        return $fixtures;
    }

    #[DataProvider('audrigaFixtureProvider')]
    public function test_audriga_vcard_parses_to_jscontact(string $fixture): void
    {
        $vcard = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.vcf");

        $card = $this->converter->cardFromVCard($vcard);

        $this->assertSame('Card', $card['@type'] ?? null);
        $this->assertArrayHasKey('uid', $card);
        $this->assertNotSame('', (string) $card['uid']);
        $this->assertTrue(
            isset($card['name']['full']) || isset($card['name']['components']),
            "Fixture {$fixture} should expose a display name",
        );
    }

    #[DataProvider('audrigaFixtureProvider')]
    public function test_audriga_vcard_parse_is_deterministic(string $fixture): void
    {
        $vcard = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.vcf");

        $first = $this->converter->cardFromVCard($vcard);
        $second = $this->converter->cardFromVCard($vcard);

        $this->assertSame($first, $second, "Re-parse should be stable for {$fixture}");
    }

    #[DataProvider('audrigaFixtureProvider')]
    public function test_audriga_vcard_round_trip_is_stable(string $fixture): void
    {
        $vcard = (string) file_get_contents("{$this->fixturesDir}/{$fixture}.vcf");
        $card = $this->converter->cardFromVCard($vcard);

        $roundTripVcard = $this->converter->vCardFromCard($card);
        $this->assertStringContainsString('BEGIN:VCARD', $roundTripVcard);

        $once = $this->converter->cardFromVCard($roundTripVcard);
        $twice = $this->converter->cardFromVCard($roundTripVcard);

        $this->assertSame($once, $twice, "vCard round-trip re-parse should be stable for {$fixture}");
    }
}
