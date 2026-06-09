<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Services\Drive\DriveGitVersioningService;
use Sabre\DAV\Auth\Plugin as AuthPlugin;
use Sabre\DAV\Server;
use Sabre\DAV\ServerPlugin;
use Sabre\HTTP\RequestInterface;
use Sabre\HTTP\ResponseInterface;

final class GitVersioningPlugin extends ServerPlugin
{
    private Server $server;

    public function __construct(private DriveGitVersioningService $versioning) {}

    public function initialize(Server $server): void
    {
        $this->server = $server;
        $server->on('afterCreateFile', [$this, 'onUpsert']);
        $server->on('afterWriteContent', [$this, 'onUpsert']);
        foreach (['DELETE', 'MOVE', 'COPY'] as $method) {
            $server->on('afterMethod:'.$method, [$this, 'afterMutatingMethod']);
        }
    }

    public function onUpsert(string $uri): void
    {
        $path = trim($uri, '/');
        if ($path === '') {
            return;
        }

        $this->versioning->recordDavUpsert($path, $this->currentPrincipal());
    }

    public function afterMutatingMethod(RequestInterface $request, ResponseInterface $response): void
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

        $principal = $this->currentPrincipal();

        if ($method === 'DELETE') {
            $this->versioning->recordDavDelete($path, $principal);

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
                    if ($method === 'MOVE') {
                        $this->versioning->recordDavMove($path, $destPath, $principal);
                    } else {
                        $this->versioning->recordDavUpsert($destPath, $principal);
                    }
                }
            }

            return;
        }
    }

    private function currentPrincipal(): ?string
    {
        $auth = $this->server->getPlugin('auth');
        if (! $auth instanceof AuthPlugin) {
            return null;
        }

        $principal = $auth->getCurrentPrincipal();

        return is_string($principal) && $principal !== '' ? $principal : null;
    }
}
