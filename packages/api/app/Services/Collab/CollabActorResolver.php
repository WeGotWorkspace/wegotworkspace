<?php

declare(strict_types=1);

namespace App\Services\Collab;

use App\Services\Voice\VoiceRequestAuth;
use Illuminate\Http\Request;

final class CollabActorResolver
{
    public function __construct(private VoiceRequestAuth $auth) {}

    /**
     * @return non-empty-string
     */
    public function requireUsername(Request $request): string
    {
        $realm = (string) config('wgw.auth_realm', 'SabreDAV');
        $username = $this->auth->tryAuthenticatedUsername($request, $realm);
        if ($username === null || $username === '') {
            throw new CollabResponseException(401, [
                'error' => 'auth_required',
                'message' => 'Sign in to join document collaboration.',
            ]);
        }

        return $username;
    }

    /**
     * @return non-empty-string
     */
    public function ownerMarker(string $username): string
    {
        return 'u:'.$username;
    }
}
