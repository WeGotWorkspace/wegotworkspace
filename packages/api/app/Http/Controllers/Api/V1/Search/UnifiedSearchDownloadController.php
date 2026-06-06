<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Search;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Search\UnifiedSearchService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class UnifiedSearchDownloadController
{
    public function __construct(private UnifiedSearchService $search) {}

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'source_type' => ['required', 'string', 'in:caldav,carddav'],
            'source_key' => ['required', 'string', 'max:512'],
        ]);
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return $this->download(
            (string) $principal['username'],
            (string) $validated['source_type'],
            (string) $validated['source_key'],
        );
    }

    public function contentByResultId(Request $request, string $resultId): Response
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $decoded = json_decode(base64_decode(strtr($resultId, '-_', '+/'), true) ?: '', true);
        if (is_array($decoded) && isset($decoded['source_type'], $decoded['source_key'])) {
            return $this->download(
                (string) $principal['username'],
                (string) $decoded['source_type'],
                (string) $decoded['source_key'],
            );
        }

        $validated = $request->validate([
            'source_type' => ['required', 'string', 'in:caldav,carddav'],
            'source_key' => ['required', 'string', 'max:512'],
        ]);

        return $this->download(
            (string) $principal['username'],
            (string) $validated['source_type'],
            (string) $validated['source_key'],
        );
    }

    private function download(string $username, string $sourceType, string $sourceKey): Response
    {
        $record = $this->search->downloadRecord($username, $sourceType, $sourceKey);
        if ($record === null) {
            throw new ApiHttpException(404, 'Search record not found.', 'not_found');
        }

        return response($record['content'], 200, [
            'Content-Type' => $record['content_type'],
            'Content-Disposition' => 'attachment; filename="'.addslashes($record['filename']).'"',
        ]);
    }
}
