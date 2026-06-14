<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Models\Card;
use App\Services\Contacts\Conversion\ConversionSupport;
use App\Services\Contacts\Conversion\VCardJsContactConverter;
use Illuminate\Support\Str;

final class ContactCardMapper
{
    public function __construct(
        private readonly VCardJsContactConverter $converter,
        private readonly ContactMediaBlobResolver $mediaBlobs,
        private readonly ContactMemberResolver $members,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toContactCard(Card $card, string $addressBookUri, string $username): array
    {
        $raw = is_string($card->carddata) ? $card->carddata : (string) $card->carddata;
        $contact = $this->converter->cardFromVCard($raw);
        $contact = $this->mediaBlobs->exposeBlobsOnRead($username, $contact);
        $contact = $this->members->apply($username, $contact);

        $contact['id'] = self::cardIdFromUri((string) $card->uri);
        $contact['addressBookIds'] = [$addressBookUri => true];

        $lastModified = (int) ($card->lastmodified ?? 0);
        if ($lastModified > 0) {
            $timestamp = gmdate('Y-m-d\TH:i:s\Z', $lastModified);
            if (! isset($contact['updated']) || ! is_string($contact['updated']) || $contact['updated'] === '') {
                $contact['updated'] = $timestamp;
            }
            if (! isset($contact['created']) || ! is_string($contact['created']) || $contact['created'] === '') {
                $contact['created'] = $timestamp;
            }
        }

        return $contact;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function toVCard(string $username, array $payload): string
    {
        $payload = $this->mediaBlobs->resolveBlobsOnWrite($username, $payload);

        return $this->converter->vCardFromCard($payload);
    }

    public static function cardIdFromUri(string $uri): string
    {
        return str_ends_with($uri, '.vcf')
            ? substr($uri, 0, -4)
            : $uri;
    }

    public static function cardUriFromId(string $cardId): string
    {
        return str_ends_with($cardId, '.vcf')
            ? $cardId
            : $cardId.'.vcf';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function generateCardUri(array $payload): string
    {
        $base = ConversionSupport::deriveFullName($payload);
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $base) ?? '', '-'));
        if ($slug === '') {
            $slug = 'contact';
        }

        $suffix = substr(str_replace('-', '', (string) Str::uuid()), 0, 8);

        return $slug.'-'.$suffix.'.vcf';
    }
}
