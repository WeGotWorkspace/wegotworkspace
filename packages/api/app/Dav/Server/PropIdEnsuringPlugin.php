<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Services\Contacts\PropIdEnsurer;
use Illuminate\Support\Facades\DB;
use Sabre\CardDAV\Backend\PDO as CardPDO;
use Sabre\DAV\Server;
use Sabre\DAV\ServerPlugin;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

/**
 * After CardDAV card writes, backfill missing RFC 9554 PROP-ID parameters.
 */
final class PropIdEnsuringPlugin extends ServerPlugin
{
    private Server $server;

    private bool $reentrant = false;

    public function __construct(
        private readonly PropIdEnsurer $propIdEnsurer,
        private readonly CardPDO $cardBackend,
    ) {}

    public function initialize(Server $server): void
    {
        $this->server = $server;
        foreach (['PUT', 'PATCH'] as $method) {
            $server->on('afterMethod:'.$method, [$this, 'afterWriteMethod']);
        }
    }

    public function afterWriteMethod(RequestInterface $request, ResponseInterface $response): void
    {
        if ($this->reentrant) {
            return;
        }

        $status = $response->getStatus();
        if ($status < 200 || $status >= 400) {
            return;
        }

        $path = trim((string) $request->getPath(), '/');
        $location = $this->parseCardPath($path);
        if ($location === null) {
            return;
        }

        $card = $this->cardBackend->getCard($location['addressBookId'], $location['cardUri']);
        if ($card === null) {
            return;
        }

        $raw = is_string($card['carddata'] ?? null) ? $card['carddata'] : (string) ($card['carddata'] ?? '');
        if ($raw === '') {
            return;
        }

        $result = $this->propIdEnsurer->ensure($raw);
        if (! $result['changed']) {
            return;
        }

        $this->reentrant = true;
        try {
            $this->cardBackend->updateCard(
                $location['addressBookId'],
                $location['cardUri'],
                $result['vcard'],
            );
        } finally {
            $this->reentrant = false;
        }
    }

    /**
     * @return array{addressBookId: int, cardUri: string}|null
     */
    private function parseCardPath(string $path): ?array
    {
        $segments = explode('/', $path);
        if (count($segments) !== 4 || $segments[0] !== 'addressbooks') {
            return null;
        }

        $cardUri = $segments[3];
        if (! str_ends_with(strtolower($cardUri), '.vcf')) {
            return null;
        }

        $principalUri = 'principals/'.$segments[1];
        $bookUri = $segments[2];
        $addressBookId = $this->resolveAddressBookId($principalUri, $bookUri);
        if ($addressBookId === null) {
            return null;
        }

        return [
            'addressBookId' => $addressBookId,
            'cardUri' => $cardUri,
        ];
    }

    private function resolveAddressBookId(string $principalUri, string $bookUri): ?int
    {
        foreach ($this->cardBackend->getAddressBooksForUser($principalUri) as $book) {
            if (($book['uri'] ?? '') === $bookUri) {
                return (int) ($book['id'] ?? 0);
            }
        }

        return null;
    }

    public static function cardBackendFromConnection(): CardPDO
    {
        return new CardPDO(DB::connection('wgw')->getPdo());
    }
}
