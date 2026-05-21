<?php

declare(strict_types=1);

namespace App\Services\Voice;

use Illuminate\Http\Request;

/**
 * Selects Laravel or legacy (main) voice signaling via {@see config('wgw.voice.signaling')}.
 */
final class VoiceSignalingRouter
{
    public function __construct(
        private VoiceSignalingService $laravel,
        private LegacyVoiceSignalingGateway $legacy,
    ) {
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function room(array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->room($body)
            : $this->laravel->roomStatus($body);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function join(Request $request, array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->join($request, $body)
            : $this->laravel->join($request, $body);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function poll(Request $request, array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->poll($request, $body)
            : $this->laravel->poll($request, $body);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function send(Request $request, array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->send($request, $body)
            : $this->laravel->send($request, $body);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function leave(Request $request, array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->leave($request, $body)
            : $this->laravel->leave($request, $body);
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    public function chat(Request $request, array $body): array
    {
        return $this->useLegacy()
            ? $this->legacy->chat($request, $body)
            : $this->laravel->chat($request, $body);
    }

    private function useLegacy(): bool
    {
        return config('wgw.voice.signaling') === 'legacy';
    }
}
