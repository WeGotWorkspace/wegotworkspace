<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Contacts;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Contacts\ContactBlobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ContactBlobsController
{
    public function __construct(private readonly ContactBlobService $blobs) {}

    public function store(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $file = $request->file('file');
        $contents = null;
        $mediaType = null;

        if ($file !== null) {
            $contents = $file->get();
            $mediaType = $file->getMimeType() ?: 'application/octet-stream';
        } else {
            $contents = $request->getContent();
            $mediaType = $request->header('Content-Type') ?: 'application/octet-stream';
            if (str_contains($mediaType, ';')) {
                $mediaType = trim(explode(';', $mediaType)[0]);
            }
        }

        if (! is_string($contents) || $contents === '') {
            throw new ApiHttpException(400, 'Blob body is required.', 'bad_request');
        }

        $this->blobs->assertPhotoMediaType((string) $mediaType);
        $blobId = $this->blobs->storeUploaded($principal['username'], (string) $mediaType, $contents);

        return response()->json([
            'blobId' => $blobId,
            'type' => $mediaType,
            'size' => strlen($contents),
        ], 201);
    }

    public function show(Request $request, string $blobId): Response
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $blob = $this->blobs->retrieve($principal['username'], $blobId);
        if ($blob === null) {
            throw new ApiHttpException(404, 'Blob not found.', 'not_found');
        }

        return response($blob['contents'], 200, [
            'Content-Type' => $blob['mediaType'],
        ]);
    }
}
