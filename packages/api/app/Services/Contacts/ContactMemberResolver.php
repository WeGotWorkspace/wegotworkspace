<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Models\Card;
use App\Services\Contacts\Conversion\ConversionSupport;
use App\Services\Contacts\Conversion\VCardJsContactConverter;

/**
 * RFC 9610 group member resolution — preserve uids, optionally resolve to card ids.
 */
final class ContactMemberResolver
{
    public function __construct(
        private readonly VCardJsContactConverter $converter = new VCardJsContactConverter,
    ) {}

    /**
     * @param  array<string, mixed>  $contact
     * @return array<string, mixed>
     */
    public function apply(string $username, array $contact): array
    {
        $members = $contact['members'] ?? null;
        if (! is_array($members) || $members === []) {
            return $contact;
        }

        $resolved = [];
        foreach (array_keys(array_filter($members, static fn ($enabled): bool => (bool) $enabled)) as $memberUid) {
            $cardId = $this->findCardIdByUid($username, (string) $memberUid);
            if ($cardId !== null) {
                $resolved[(string) $memberUid] = $cardId;
            }
        }

        if ($resolved !== []) {
            $contact['memberCardIds'] = $resolved;
        }

        return $contact;
    }

    private function findCardIdByUid(string $username, string $uid): ?string
    {
        $normalizedUid = ConversionSupport::normalizeContactUidForMatch($uid);
        $cards = Card::query()
            ->whereHas('addressbook', function ($query) use ($username): void {
                $query->where('principaluri', 'principals/'.$username);
            })
            ->get(['uri', 'carddata']);

        foreach ($cards as $card) {
            $raw = is_string($card->carddata) ? $card->carddata : (string) $card->carddata;
            try {
                $parsed = $this->converter->cardFromVCard($raw);
            } catch (\Throwable) {
                continue;
            }
            $cardUid = $parsed['uid'] ?? null;
            if (! is_string($cardUid) || $cardUid === '') {
                continue;
            }
            if (ConversionSupport::normalizeContactUidForMatch($cardUid) === $normalizedUid) {
                return ContactCardMapper::cardIdFromUri((string) $card->uri);
            }
        }

        return null;
    }
}
