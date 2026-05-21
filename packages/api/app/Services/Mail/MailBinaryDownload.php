<?php

declare(strict_types=1);

namespace App\Services\Mail;

final class MailBinaryDownload
{
    public function __construct(
        public readonly string $mime,
        public readonly string $filename,
        public readonly string $bytes,
    ) {}
}
