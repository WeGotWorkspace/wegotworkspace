<?php

declare(strict_types=1);

namespace App\Services\Contacts\Conversion;

/**
 * Split multi-vCard files and classify group cards for ordered import.
 */
final class ContactCardVcfImportSupport
{
    /**
     * @return list<string>
     */
    public static function splitVcards(string $input): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $input);
        $parts = preg_split('/(?=BEGIN:VCARD)/i', $normalized, -1, PREG_SPLIT_NO_EMPTY);
        if ($parts === false) {
            return [];
        }

        $vcards = [];
        foreach ($parts as $part) {
            $trimmed = trim($part);
            if ($trimmed === '') {
                continue;
            }
            if (! str_contains(strtoupper($trimmed), 'END:VCARD')) {
                continue;
            }
            $vcards[] = $trimmed;
        }

        return $vcards;
    }

    /**
     * @param  array<string, mixed>  $card
     */
    public static function isGroupCard(array $card): bool
    {
        if (($card['kind'] ?? null) === 'group') {
            return true;
        }

        $members = $card['members'] ?? null;
        if (! is_array($members)) {
            return false;
        }

        foreach ($members as $enabled) {
            if ($enabled === true) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $card
     * @return array<string, mixed>
     */
    public static function createPayload(array $card, string $addressBookUri): array
    {
        unset($card['id'], $card['etag'], $card['memberCardIds']);
        $card['addressBookIds'] = [$addressBookUri => true];

        return $card;
    }
}
