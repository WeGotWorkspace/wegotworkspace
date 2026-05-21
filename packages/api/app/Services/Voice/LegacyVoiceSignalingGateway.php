<?php

declare(strict_types=1);

namespace App\Services\Voice;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Wgw\Legacy\Voice\LegacyVoiceAuth;
use Wgw\Legacy\Voice\LegacyVoiceException;
use Wgw\Legacy\Voice\LegacyVoiceSignaling;

/**
 * Runs main-branch voice signaling inside Laravel (PDO on {@code wgw} connection).
 */
final class LegacyVoiceSignalingGateway
{
    public function __construct(private LegacyVoiceAuth $auth)
    {
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function room(array $body): array
    {
        return $this->dispatch('room', $body, null);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function join(Request $request, array $body): array
    {
        return $this->dispatch('join', $body, $request);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function poll(Request $request, array $body): array
    {
        return $this->dispatch('poll', $body, $request);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function send(Request $request, array $body): array
    {
        return $this->dispatch('send', $body, $request);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function leave(Request $request, array $body): array
    {
        return $this->dispatch('leave', $body, $request);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function chat(Request $request, array $body): array
    {
        return $this->dispatch('chat', $body, $request);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function dispatch(string $action, array $body, ?Request $request): array
    {
        try {
            $realm = (string) config('wgw.auth_realm', 'SabreDAV');
            $pdo = DB::connection('wgw')->getPdo();

            return LegacyVoiceSignaling::dispatch(
                $pdo,
                $realm,
                $action,
                $body,
                function () use ($request, $realm): ?string {
                    if ($request === null) {
                        return null;
                    }

                    return $this->auth->tryAuthenticatedUsername($request, $realm);
                },
            );
        } catch (LegacyVoiceException $e) {
            throw new VoiceResponseException($e->status, $e->payload);
        }
    }
}
