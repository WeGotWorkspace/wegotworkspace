<?php

declare(strict_types=1);

namespace App\Services\Voice;

use Illuminate\Http\Request;

final class VoiceActorResolver
{
    public function __construct(private VoiceRequestAuth $auth)
    {
    }

    public function tryAuthenticatedUsername(Request $request): ?string
    {
        $realm = (string) config('wgw.auth_realm', 'SabreDAV');

        return $this->auth->tryAuthenticatedUsername($request, $realm);
    }

    /**
     * @param array<string, mixed> $body
     */
    public function requireActorMarker(Request $request, array $body): string
    {
        $marker = $this->ownerMarkerForAuthenticatedUser($this->tryAuthenticatedUsername($request));
        if ($marker !== null) {
            return $marker;
        }

        $sessionKey = $this->readGuestSessionKey($body);
        if ($sessionKey !== null) {
            return $this->ownerMarkerForGuestSession($sessionKey);
        }

        throw new VoiceResponseException(401, [
            'error' => 'auth_required',
            'message' => 'Sign in or re-open the guest join link to start a signaling session.',
        ]);
    }

    /**
     * @return non-empty-string|null
     */
    public function ownerMarkerForAuthenticatedUser(?string $username): ?string
    {
        if ($username === null || $username === '') {
            return null;
        }

        return 'u:'.$username;
    }

    /**
     * @return non-empty-string
     */
    public function newGuestSessionKey(): string
    {
        return bin2hex(random_bytes(16));
    }

    /**
     * @return non-empty-string
     */
    public function ownerMarkerForGuestSession(string $sessionKey): string
    {
        return 'g:'.$sessionKey;
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return non-empty-string|null
     */
    public function readGuestSessionKey(array $body): ?string
    {
        $raw = $body['sessionKey'] ?? null;
        if (! is_string($raw)) {
            return null;
        }
        if (! preg_match('/^[a-f0-9]{32}$/', $raw)) {
            return null;
        }

        return $raw;
    }
}
