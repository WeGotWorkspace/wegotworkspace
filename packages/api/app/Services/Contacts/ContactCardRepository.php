<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Exceptions\ApiHttpException;
use App\Models\Addressbook;
use App\Models\Card;
use App\Services\Contacts\Conversion\ConversionSupport;
use App\Services\Search\SearchIndexerService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\CardDAV\Backend\PDO as CardPDO;

final class ContactCardRepository
{
    public function __construct(
        private readonly ContactCardMapper $mapper,
        private readonly SearchIndexerService $searchIndexer,
    ) {}

    /**
     * @return array{list: list<array<string, mixed>>}
     */
    public function list(string $username, string $addressBookId): array
    {
        $book = $this->findOwnedBook($username, $addressBookId);
        if ($book === null) {
            throw new ApiHttpException(404, 'Address book not found.', 'not_found');
        }

        $cards = Card::query()
            ->where('addressbookid', (int) $book->id)
            ->orderBy('uri')
            ->get();

        return [
            'list' => $cards
                ->map(fn (Card $card): array => $this->mapper->toContactCard($card, $addressBookId))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(string $username, string $cardId): array
    {
        $located = $this->findOwnedCard($username, $cardId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Contact card not found.', 'not_found');
        }

        return $this->mapper->toContactCard($located['card'], $located['bookUri']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function create(string $username, array $payload): array
    {
        $book = $this->resolveAddressBookFromPayload($username, $payload);
        $cardPayload = $this->normalizeCardPayload($payload);
        $cardUri = $this->allocateCardUri((int) $book->id, $cardPayload);
        $vcard = $this->mapper->toVCard($cardPayload);

        $this->cardBackend()->createCard((int) $book->id, $cardUri, $vcard);
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexCardObjectFromPath(
            $this->cardDavPath($username, (string) $book->uri, $cardUri)
        ));

        $card = $this->findCardInBook((int) $book->id, $cardUri);
        if ($card === null) {
            throw new ApiHttpException(500, 'Could not load created contact card.', 'server_error');
        }

        return $this->mapper->toContactCard($card, (string) $book->uri);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function update(string $username, string $cardId, array $payload): array
    {
        $located = $this->findOwnedCard($username, $cardId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Contact card not found.', 'not_found');
        }

        $book = $located['book'];
        $card = $located['card'];
        $cardUri = (string) $card->uri;
        $existingContact = $this->mapper->toContactCard($card, (string) $book->uri);
        $cardPayload = $this->normalizeCardPayload($payload, $existingContact);
        $cardPayload['id'] = ContactCardMapper::cardIdFromUri($cardUri);
        $cardPayload['addressBookIds'] = [(string) $book->uri => true];

        $vcard = $this->mapper->toVCard($cardPayload);
        $addressBookId = (int) $card->addressbookid;
        $this->cardBackend()->updateCard($addressBookId, $cardUri, $vcard);
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexCardObjectFromPath(
            $this->cardDavPath($username, (string) $book->uri, $cardUri)
        ));

        $updated = $this->findCardInBook($addressBookId, $cardUri);
        if ($updated === null) {
            throw new ApiHttpException(500, 'Could not load updated contact card.', 'server_error');
        }

        return $this->mapper->toContactCard($updated, (string) $book->uri);
    }

    /**
     * @param  array<string, mixed>  $patch
     * @return array<string, mixed>
     */
    public function patch(string $username, string $cardId, array $patch): array
    {
        $located = $this->findOwnedCard($username, $cardId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Contact card not found.', 'not_found');
        }

        $book = $located['book'];
        $card = $located['card'];
        $cardUri = (string) $card->uri;
        $existingContact = $this->mapper->toContactCard($card, (string) $book->uri);
        $merged = ConversionSupport::deepMergeContactCardPatch($existingContact, $patch);
        $cardPayload = $this->normalizeCardPayload($merged, $existingContact);
        $cardPayload['id'] = ContactCardMapper::cardIdFromUri($cardUri);
        if (! isset($cardPayload['addressBookIds']) || ! is_array($cardPayload['addressBookIds'])) {
            $cardPayload['addressBookIds'] = [(string) $book->uri => true];
        }

        $vcard = $this->mapper->toVCard($cardPayload);
        $addressBookId = (int) $card->addressbookid;
        $this->cardBackend()->updateCard($addressBookId, $cardUri, $vcard);
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexCardObjectFromPath(
            $this->cardDavPath($username, (string) $book->uri, $cardUri)
        ));

        $updated = $this->findCardInBook($addressBookId, $cardUri);
        if ($updated === null) {
            throw new ApiHttpException(500, 'Could not load patched contact card.', 'server_error');
        }

        return $this->mapper->toContactCard($updated, (string) $book->uri);
    }

    /**
     * @return array{ok: true}
     */
    public function delete(string $username, string $cardId): array
    {
        $located = $this->findOwnedCard($username, $cardId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Contact card not found.', 'not_found');
        }

        $book = $located['book'];
        $card = $located['card'];
        $cardUri = (string) $card->uri;
        $this->cardBackend()->deleteCard((int) $card->addressbookid, $cardUri);
        $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath(
            $this->cardDavPath($username, (string) $book->uri, $cardUri)
        ));

        return ['ok' => true];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveAddressBookFromPayload(string $username, array $payload): Addressbook
    {
        $addressBookIds = $payload['addressBookIds'] ?? null;
        if (! is_array($addressBookIds) || $addressBookIds === []) {
            throw new ApiHttpException(400, 'addressBookIds is required.', 'bad_request');
        }

        $bookUri = null;
        foreach ($addressBookIds as $id => $enabled) {
            if ($enabled === true) {
                $bookUri = (string) $id;
                break;
            }
        }

        if ($bookUri === null || $bookUri === '') {
            throw new ApiHttpException(400, 'addressBookIds is required.', 'bad_request');
        }

        $book = $this->findOwnedBook($username, $bookUri);
        if ($book === null) {
            throw new ApiHttpException(404, 'Address book not found.', 'not_found');
        }

        return $book;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>|null  $existingCard
     * @return array<string, mixed>
     */
    private function normalizeCardPayload(array $payload, ?array $existingCard = null): array
    {
        $card = $payload;
        unset($card['id']);

        if (! isset($card['@type']) || ! is_string($card['@type'])) {
            $card['@type'] = 'Card';
        }
        if (! isset($card['version']) || ! is_string($card['version'])) {
            $card['version'] = '1.0';
        }
        if (! isset($card['uid']) || ! is_string($card['uid']) || trim($card['uid']) === '') {
            $card['uid'] = 'urn:uuid:'.Str::uuid()->toString();
        }

        return ConversionSupport::normalizeCardMapKeys($card, $existingCard);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function allocateCardUri(int $addressBookId, array $payload): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = ContactCardMapper::generateCardUri($payload);
            if ($this->findCardInBook($addressBookId, $candidate) === null) {
                return $candidate;
            }
        }

        throw new ApiHttpException(500, 'Could not allocate contact card id.', 'server_error');
    }

    /**
     * @return array{card: Card, book: Addressbook, bookUri: string}|null
     */
    private function findOwnedCard(string $username, string $cardId): ?array
    {
        $cardUri = ContactCardMapper::cardUriFromId($cardId);
        $card = Card::query()
            ->with('addressbook')
            ->where(function ($query) use ($cardId, $cardUri): void {
                $query->where('uri', $cardId)
                    ->orWhere('uri', $cardUri);
            })
            ->whereHas('addressbook', function ($query) use ($username): void {
                $query->where('principaluri', $this->principalUri($username));
            })
            ->first();

        if ($card === null || $card->addressbook === null) {
            return null;
        }

        return [
            'card' => $card,
            'book' => $card->addressbook,
            'bookUri' => (string) $card->addressbook->uri,
        ];
    }

    private function findOwnedBook(string $username, string $addressBookId): ?Addressbook
    {
        return Addressbook::query()
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $addressBookId)
            ->first();
    }

    private function findCardInBook(int $addressBookId, string $cardUri): ?Card
    {
        return Card::query()
            ->where('addressbookid', $addressBookId)
            ->where('uri', $cardUri)
            ->first();
    }

    private function cardDavPath(string $username, string $bookUri, string $cardUri): string
    {
        return 'addressbooks/'.$username.'/'.$bookUri.'/'.$cardUri;
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }

    private function cardBackend(): CardPDO
    {
        return new CardPDO(DB::connection('wgw')->getPdo());
    }

    private function syncSearchIndex(callable $callback): void
    {
        try {
            $callback();
        } catch (QueryException) {
            // Search index is optional in some test and bootstrap contexts.
        } catch (\Throwable) {
            // Search sync should never block contact writes.
        }
    }
}
