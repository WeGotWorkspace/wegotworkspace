<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Storage\WgwStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;

/**
 * Shared Docs workspace fixtures: resumable upload helpers and doc disk seeding.
 */
trait DocsTestFixtures
{
    use DriveTestFixtures;

    protected function setUpDocsFixtures(): void
    {
        $this->setUpDriveFixtures();
    }

    protected function tearDownDocsFixtures(): void
    {
        $this->tearDownDriveFixtures();
    }

    protected function seedDocFile(string $username, string $filename, string $content): string
    {
        app(WgwStorage::class)->files()->put('users/'.$username.'/docs/'.$filename, $content);

        return '/users/'.$username.'/docs/'.$filename;
    }

    protected function uploadDoc(
        string $token,
        string $parentPath,
        string $filename,
        string $content,
        ?string $identifier = null,
    ): TestResponse {
        $identifier ??= 'docs-upload-'.md5($parentPath.'|'.$filename);

        return $this->withBearer($token)->post('/api/v1/files/content?path='.$parentPath, [
            'file' => UploadedFile::fake()->createWithContent($filename, $content),
            'resumableFilename' => $filename,
            'resumableIdentifier' => $identifier,
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ]);
    }

    protected function getDocContent(string $token, string $path): TestResponse
    {
        return $this->withBearer($token)->get('/api/v1/files/content?path='.$path);
    }
}
