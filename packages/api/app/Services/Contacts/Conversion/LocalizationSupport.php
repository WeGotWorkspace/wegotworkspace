<?php

declare(strict_types=1);

namespace App\Services\Contacts\Conversion;

use Sabre\VObject\Component\VCard;
use Sabre\VObject\Property;

/**
 * RFC 9555 LANGUAGE parameter ↔ JSContact localizations patches.
 */
final class LocalizationSupport
{
    /**
     * @param  array<string, mixed>  $card
     */
    public static function applyFromVCard(VCard $document, array &$card): void
    {
        $localizations = is_array($card['localizations'] ?? null) ? $card['localizations'] : [];

        foreach ($document->select('FN') as $property) {
            if (ConversionSupport::isDerived($property) || ! isset($property['LANGUAGE'])) {
                continue;
            }
            $lang = strtolower(trim((string) $property['LANGUAGE']));
            $value = trim((string) $property->getValue());
            if ($lang === '' || $value === '') {
                continue;
            }
            if (($card['name']['full'] ?? null) === $value) {
                continue;
            }
            $localizations[$lang] = array_merge(
                is_array($localizations[$lang] ?? null) ? $localizations[$lang] : [],
                ['name/full' => $value],
            );
        }

        foreach ($document->select('ADR') as $index => $property) {
            if (! isset($property['LANGUAGE'])) {
                continue;
            }
            $lang = strtolower(trim((string) $property['LANGUAGE']));
            if ($lang === '') {
                continue;
            }
            $id = ConversionSupport::propertyId($property, $index);
            $label = isset($property['LABEL']) ? (string) $property['LABEL'] : null;
            if ($label !== null && $label !== '') {
                $localizations[$lang] = array_merge(
                    is_array($localizations[$lang] ?? null) ? $localizations[$lang] : [],
                    ['addresses/'.$id.'/full' => $label],
                );
            }
        }

        foreach ($document->select('NOTE') as $index => $property) {
            if (! isset($property['LANGUAGE'])) {
                continue;
            }
            $lang = strtolower(trim((string) $property['LANGUAGE']));
            $value = trim((string) $property->getValue());
            if ($lang === '' || $value === '') {
                continue;
            }
            $id = ConversionSupport::propertyId($property, $index);
            $localizations[$lang] = array_merge(
                is_array($localizations[$lang] ?? null) ? $localizations[$lang] : [],
                ['notes/'.$id.'/note' => str_replace('\,', ',', $value)],
            );
        }

        if ($localizations !== []) {
            $card['localizations'] = $localizations;
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    public static function writeToVCard(VCard $vcard, array $card): void
    {
        $localizations = $card['localizations'] ?? null;
        if (! is_array($localizations)) {
            return;
        }

        foreach ($localizations as $lang => $patch) {
            if (! is_array($patch)) {
                continue;
            }
            $language = strtolower(trim((string) $lang));
            if ($language === '') {
                continue;
            }

            foreach ($patch as $pointer => $value) {
                if (! is_string($value) || $value === '') {
                    continue;
                }
                self::writeLocalizedProperty($vcard, $language, (string) $pointer, $value, $card);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private static function writeLocalizedProperty(
        VCard $vcard,
        string $language,
        string $pointer,
        string $value,
        array $card,
    ): void {
        if ($pointer === 'name/full') {
            $primary = is_array($card['name'] ?? null) ? ($card['name']['full'] ?? null) : null;
            if ($primary === $value) {
                return;
            }
            $vcard->add('FN', $value, ['language' => $language]);

            return;
        }

        if (preg_match('#^addresses/([^/]+)/full$#', $pointer, $matches) === 1) {
            $vcard->add('ADR', ['', '', '', '', '', '', ''], [
                'language' => $language,
                'label' => $value,
                'prop-id' => $matches[1],
            ]);

            return;
        }

        if (preg_match('#^notes/([^/]+)/note$#', $pointer, $matches) === 1) {
            $vcard->add('NOTE', $value, [
                'language' => $language,
                'prop-id' => $matches[1],
            ]);
        }
    }

    /**
     * @return list<Property>
     */
    public static function extraFnProperties(VCard $document): array
    {
        $extras = [];
        $primaryAssigned = false;
        foreach ($document->select('FN') as $property) {
            if (ConversionSupport::isDerived($property)) {
                continue;
            }
            if (isset($property['LANGUAGE'])) {
                continue;
            }
            if (! $primaryAssigned) {
                $primaryAssigned = true;

                continue;
            }
            $extras[] = $property;
        }

        return $extras;
    }
}
