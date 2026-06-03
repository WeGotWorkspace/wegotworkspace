<?php

declare(strict_types=1);

namespace App\Services\System;

use App\Support\ApiUrlBuilder;

final class CapabilitiesService
{
    public function __construct(private ApiUrlBuilder $urls) {}

    /**
     * @return array{
     *   apiVersion: string,
     *   auth: array<string, string>,
     *   domains: list<array{name: string, requiredRole: string}>
     * }
     */
    public function snapshot(): array
    {
        return [
            'apiVersion' => 'v1',
            'auth' => [
                'type' => 'bearer-jwt-rs256',
                'tokenEndpoint' => $this->urls->v1('auth/token'),
                'refreshEndpoint' => $this->urls->v1('auth/refresh'),
                'revokeEndpoint' => $this->urls->v1('auth/revoke'),
                'jwksEndpoint' => $this->urls->v1('.well-known/jwks.json'),
            ],
            'domains' => $this->domains(),
        ];
    }

    /**
     * @return list<array{name: string, requiredRole: string}>
     */
    private function domains(): array
    {
        $map = [
            'admin' => 'admin',
            'settings' => 'user',
            'mail' => 'user',
            'drive' => 'user',
            'notes' => 'user',
            'plugins' => 'user',
            'voice' => 'guest',
            'installer' => 'guest',
            'home' => 'guest',
            'dav' => 'user',
        ];
        $out = [];
        foreach ($map as $name => $requiredRole) {
            $out[] = ['name' => $name, 'requiredRole' => $requiredRole];
        }

        return $out;
    }
}
