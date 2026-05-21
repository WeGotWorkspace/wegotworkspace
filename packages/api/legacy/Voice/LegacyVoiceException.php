<?php

declare(strict_types=1);

namespace Wgw\Legacy\Voice;

final class LegacyVoiceException extends \RuntimeException
{
    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public readonly int $status,
        public readonly array $payload,
    ) {
        parent::__construct((string) ($payload['error'] ?? 'voice_error'));
    }
}
