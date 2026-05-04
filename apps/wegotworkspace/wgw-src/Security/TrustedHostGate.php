<?php

declare(strict_types=1);

namespace App\Security;

/**
 * Validates Host headers against an allowlist.
 *
 * Configure explicit hosts with WGW_TRUSTED_HOSTS (comma/space separated, optional ports).
 * For local/dev fallback, VHOST_DOMAIN (if set) is also accepted.
 */
final class TrustedHostGate
{
    /**
     * @param array<string, mixed> $server
     */
    public static function isAllowed(array $server, mixed $trustedHostsEnv, mixed $vhostDomainEnv = null): bool
    {
        $requestHost = self::normalizeHostHeader((string) ($server['HTTP_HOST'] ?? ''));
        if ($requestHost === null) {
            return false;
        }

        $allowed = self::buildAllowedHosts($trustedHostsEnv, $vhostDomainEnv);
        if ($allowed === []) {
            return false;
        }

        [$requestName] = self::splitHostAndPort($requestHost);
        foreach ($allowed as $entry) {
            [$allowedName, $allowedPort] = self::splitHostAndPort($entry);
            if ($allowedPort !== null) {
                if (hash_equals($entry, $requestHost)) {
                    return true;
                }
                continue;
            }

            if (hash_equals($allowedName, $requestName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private static function buildAllowedHosts(mixed $trustedHostsEnv, mixed $vhostDomainEnv): array
    {
        $raw = is_string($trustedHostsEnv) ? trim($trustedHostsEnv) : '';
        $allowed = [];

        if ($raw !== '') {
            foreach (preg_split('/[\s,]+/', $raw) ?: [] as $piece) {
                $normalized = self::normalizeHostHeader((string) $piece);
                if ($normalized !== null) {
                    $allowed[] = $normalized;
                }
            }

            return array_values(array_unique($allowed));
        }

        // Safe fallback for local/dev installs. Production should set WGW_TRUSTED_HOSTS explicitly.
        foreach (['localhost', '127.0.0.1', '[::1]'] as $localHost) {
            $allowed[] = $localHost;
        }
        $vhost = is_string($vhostDomainEnv) ? trim($vhostDomainEnv) : '';
        if ($vhost !== '') {
            $normalized = self::normalizeHostHeader($vhost);
            if ($normalized !== null) {
                $allowed[] = $normalized;
            }
        }

        return array_values(array_unique($allowed));
    }

    /**
     * @return array{0: string, 1: int|null}
     */
    private static function splitHostAndPort(string $host): array
    {
        if ($host === '') {
            return ['', null];
        }
        if ($host[0] === '[') {
            $close = strpos($host, ']');
            if ($close === false) {
                return [$host, null];
            }

            $name = substr($host, 0, $close + 1);
            $port = null;
            if (strlen($host) > $close + 2 && $host[$close + 1] === ':') {
                $portCandidate = substr($host, $close + 2);
                if (ctype_digit($portCandidate)) {
                    $port = (int) $portCandidate;
                }
            }

            return [$name, $port];
        }

        $parts = explode(':', $host, 2);
        if (count($parts) === 2 && ctype_digit($parts[1])) {
            return [$parts[0], (int) $parts[1]];
        }

        return [$host, null];
    }

    private static function normalizeHostHeader(string $host): ?string
    {
        $host = strtolower(trim($host));
        if ($host === '' || str_contains($host, '/') || str_contains($host, '\\')) {
            return null;
        }

        if (preg_match('/^[a-z0-9.-]+(?::[0-9]{1,5})?$/', $host) === 1) {
            [$name, $port] = self::splitHostAndPort($host);
            if ($name === '' || str_starts_with($name, '.') || str_ends_with($name, '.') || str_contains($name, '..')) {
                return null;
            }
            if ($port !== null && ($port < 1 || $port > 65535)) {
                return null;
            }

            return $host;
        }

        if (preg_match('/^\\[[0-9a-f:.]+\\](?::[0-9]{1,5})?$/', $host) === 1) {
            [$name, $port] = self::splitHostAndPort($host);
            if ($name === '' || ($port !== null && ($port < 1 || $port > 65535))) {
                return null;
            }

            return $host;
        }

        return null;
    }
}
