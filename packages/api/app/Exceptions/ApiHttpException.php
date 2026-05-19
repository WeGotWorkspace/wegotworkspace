<?php

declare(strict_types=1);

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

final class ApiHttpException extends HttpException
{
    public function __construct(
        int $statusCode,
        string $message,
        private readonly ?string $apiErrorCode = null,
    ) {
        parent::__construct($statusCode, $message);
    }

    public function errorCode(): ?string
    {
        return $this->apiErrorCode;
    }
}
