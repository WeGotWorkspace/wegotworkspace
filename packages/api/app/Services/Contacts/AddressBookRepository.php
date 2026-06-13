<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Exceptions\ApiHttpException;
use App\Models\Addressbook;

final class AddressBookRepository
{
    /**
     * @return array{list: list<array<string, mixed>>}
     */
    public function list(string $username): array
    {
        $books = Addressbook::query()
            ->where('principaluri', $this->principalUri($username))
            ->orderBy('id')
            ->get();

        return [
            'list' => $books
                ->map(fn (Addressbook $book): array => $this->mapAddressBook($book))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(string $username, string $addressBookId): array
    {
        $book = $this->findOwnedBook($username, $addressBookId);
        if ($book === null) {
            throw new ApiHttpException(404, 'Address book not found.', 'not_found');
        }

        return $this->mapAddressBook($book);
    }

    private function findOwnedBook(string $username, string $addressBookId): ?Addressbook
    {
        return Addressbook::query()
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $addressBookId)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAddressBook(Addressbook $book): array
    {
        $uri = (string) $book->uri;
        $name = trim((string) ($book->displayname ?? ''));
        if ($name === '') {
            $name = $uri;
        }

        return [
            'id' => $uri,
            'name' => $name,
            'description' => is_string($book->description) && trim($book->description) !== ''
                ? trim($book->description)
                : null,
            'sortOrder' => (int) ($book->id ?? 0),
            'isDefault' => $uri === 'default',
            'isSubscribed' => true,
            'shareWith' => null,
            'myRights' => [
                'mayRead' => true,
                'mayWrite' => true,
                'mayShare' => false,
                'mayDelete' => false,
            ],
        ];
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }
}
