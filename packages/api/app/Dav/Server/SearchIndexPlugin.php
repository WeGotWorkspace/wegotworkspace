<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Services\Search\SearchIndexerService;
use Sabre\DAV\Server;
use Sabre\DAV\ServerPlugin;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

final class SearchIndexPlugin extends ServerPlugin
{
    private Server $server;

    public function __construct(private SearchIndexerService $indexer) {}

    public function initialize(Server $server): void
    {
        $this->server = $server;
        foreach (['PUT', 'PATCH', 'MKCOL', 'DELETE', 'MOVE', 'COPY'] as $method) {
            $server->on('afterMethod:'.$method, [$this, 'afterWriteMethod']);
        }
    }

    public function afterWriteMethod(RequestInterface $request, ResponseInterface $response): void
    {
        $status = $response->getStatus();
        if ($status < 200 || $status >= 400) {
            return;
        }

        $method = strtoupper($request->getMethod());
        $path = trim((string) $request->getPath(), '/');
        if ($path === '') {
            return;
        }

        if ($method === 'DELETE') {
            $this->indexer->deleteDavPath($path);

            return;
        }

        if ($method === 'MOVE' || $method === 'COPY') {
            $destination = $request->getHeader('Destination');
            if (is_string($destination) && $destination !== '') {
                try {
                    $destPath = trim((string) $this->server->calculateUri($destination), '/');
                } catch (\Throwable) {
                    $destPath = '';
                }
                if ($destPath !== '') {
                    $this->indexer->indexDavPath($destPath);
                    if ($method === 'MOVE') {
                        $this->indexer->deleteDavPath($path);
                    }
                }
            }

            return;
        }

        $this->indexer->indexDavPath($path);
    }
}
