<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\TestResponse;

/**
 * Docs workspace fixtures — resumable upload helpers matching apps drive client.
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

    protected function seedDocFile(
        string $username,
        string $filename,
        string $content,
        string $subdir = 'docs',
    ): string {
        $relative = $subdir !== '' ? $subdir.'/'.$filename : $filename;
        if ($subdir !== '') {
            File::ensureDirectoryExists($this->driveDataDir.'/files/users/'.$username.'/'.$subdir);
        }

        return $this->seedPrivateFile($username, $relative, $content);
    }

    protected function uploadDoc(
        string $token,
        string $parentPath,
        string $filename,
        string $content,
    ): TestResponse {
        $file = UploadedFile::fake()->createWithContent($filename, $content);

        return $this->withBearer($token)->post('/api/v1/files/content?path='.$parentPath, [
            'file' => $file,
            'resumableFilename' => $filename,
            'resumableIdentifier' => 'docs-test-'.md5($filename.$parentPath),
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ]);
    }

    protected function loadDocContent(string $token, string $path): TestResponse
    {
        return $this->withBearer($token)->get('/api/v1/files/content?path='.$path);
    }
}
