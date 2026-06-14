<?php

declare(strict_types=1);

namespace Tests\Unit\Contacts;

use App\Services\Contacts\ContactBlobService;
use App\Services\Contacts\ContactMediaBlobResolver;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ContactBlobServiceTest extends TestCase
{
    private ContactBlobService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('wgw_data');
        $this->service = app(ContactBlobService::class);
    }

    public function test_upload_and_resolve_photo_blob(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $blobId = $this->service->storeUploaded('bob', 'image/png', $png);

        $resolved = $this->service->retrieve('bob', $blobId);
        $this->assertIsArray($resolved);
        $this->assertSame('image/png', $resolved['mediaType']);
        $this->assertSame($png, $resolved['contents']);
    }

    public function test_expose_blob_id_on_read_omits_data_uri(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $dataUri = 'data:image/png;base64,'.base64_encode($png);
        $resolver = app(ContactMediaBlobResolver::class);

        $card = $resolver->exposeBlobsOnRead('bob', [
            'media' => [
                'm1' => ['kind' => 'photo', 'uri' => $dataUri, '@type' => 'Media'],
            ],
        ]);

        $entry = $card['media']['m1'];
        $this->assertArrayNotHasKey('uri', $entry);
        $this->assertArrayHasKey('blobId', $entry);
        $this->assertSame('image/png', $entry['mediaType']);
    }
}
