<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Services\Contacts\Conversion\ConversionSupport;
use Sabre\VObject\Component\VCard;
use Sabre\VObject\Property;
use Sabre\VObject\Reader;

/**
 * Ensures RFC 9554 PROP-ID parameters exist on multivalue vCard properties.
 */
final class PropIdEnsurer
{
    /** @var list<string> */
    private const MULTI_VALUE_PROPERTIES = [
        'EMAIL',
        'TEL',
        'ADR',
        'ORG',
        'NOTE',
        'NICKNAME',
        'PHOTO',
        'LOGO',
        'SOUND',
        'TITLE',
        'ROLE',
        'URL',
        'CONTACT-URI',
        'LANG',
        'IMPP',
        'SOCIALPROFILE',
        'PRONOUNS',
        'BDAY',
        'BIRTHPLACE',
        'DEATHDATE',
        'DEATHPLACE',
        'ANNIVERSARY',
        'KEY',
        'CALURI',
        'FBURL',
        'CALADRURI',
        'EXPERTISE',
        'HOBBY',
        'INTEREST',
        'ORG-DIRECTORY',
        'SOURCE',
        'GEO',
        'TZ',
    ];

    /**
     * @return array{vcard: string, changed: bool}
     */
    public function ensure(string $vcard): array
    {
        $document = Reader::read($vcard);
        if (! $document instanceof VCard) {
            return ['vcard' => $vcard, 'changed' => false];
        }

        $changed = false;
        foreach (self::MULTI_VALUE_PROPERTIES as $propertyName) {
            foreach ($document->select($propertyName) as $property) {
                if (! $property instanceof Property) {
                    continue;
                }
                if (isset($property['PROP-ID'])) {
                    continue;
                }
                $property['PROP-ID'] = ConversionSupport::generatePropId();
                $changed = true;
            }
        }

        if (! $changed) {
            return ['vcard' => $vcard, 'changed' => false];
        }

        return ['vcard' => $document->serialize(), 'changed' => true];
    }
}
