<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Services\Contacts\Conversion\ConversionSupport;
use Sabre\VObject\Component\VCard;
use Sabre\VObject\Property;
use Sabre\VObject\Reader;

/**
 * Normalizes corrupt group member URIs written by macOS AddressBookCore CardDAV clients.
 */
final class MemberUriSanitizer
{
    /** @var list<string> */
    private const MEMBER_PROPERTIES = [
        'MEMBER',
        'X-ADDRESSBOOKSERVER-MEMBER',
        'X-ABGROUPMEMBER',
    ];

    /**
     * @return array{vcard: string, changed: bool}
     */
    public function sanitize(string $vcard): array
    {
        $document = Reader::read($vcard);
        if (! $document instanceof VCard) {
            return ['vcard' => $vcard, 'changed' => false];
        }

        $changed = false;
        foreach (self::MEMBER_PROPERTIES as $propertyName) {
            foreach ($document->select($propertyName) as $property) {
                if (! $property instanceof Property) {
                    continue;
                }
                $raw = (string) $property->getValue();
                $normalized = ConversionSupport::normalizeMemberUid($raw);
                if ($normalized === '' || $normalized === $raw) {
                    continue;
                }
                $property->setValue($normalized);
                $changed = true;
            }
        }

        if (! $changed) {
            return ['vcard' => $vcard, 'changed' => false];
        }

        return ['vcard' => $document->serialize(), 'changed' => true];
    }
}
