<?php

declare(strict_types=1);

namespace App\Services\Mail;

use RuntimeException;

/** Carries a mail API JSON error/success payload and HTTP status for the controller layer. */
final class MailResponseException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly int $status,
        public readonly array $payload,
    ) {
        parent::__construct((string) ($payload['error'] ?? 'mail_error'));
    }
}
