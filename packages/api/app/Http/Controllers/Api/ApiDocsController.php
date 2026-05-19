<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Services\Api\OpenApiDocumentService;
use App\Services\Installer\InstallerWebBase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;

final class ApiDocsController
{
    public function __construct(private OpenApiDocumentService $openApiDocument)
    {
    }

    public function ui(Request $request): Response
    {
        $webBase = InstallerWebBase::detect();
        $specUrl = InstallerWebBase::url($webBase, '/api/openapi.json');
        $docsBase = InstallerWebBase::url($webBase, '/api/docs');

        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width, initial-scale=1">'
            .'<title>WeGotWorkspace API Docs</title>'
            .'<link rel="icon" type="image/png" href="'.e($docsBase.'/favicon-32x32.png').'">'
            .'<link rel="stylesheet" href="'.e($docsBase.'/swagger-ui.css').'">'
            .'</head><body><div id="swagger-ui"></div>'
            .'<script src="'.e($docsBase.'/swagger-ui-bundle.js').'"></script>'
            .'<script src="'.e($docsBase.'/swagger-ui-standalone-preset.js').'"></script>'
            .'<script>window.ui=SwaggerUIBundle({url:'.json_encode($specUrl).',dom_id:"#swagger-ui",'
            .'presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:"BaseLayout"});</script>'
            .'</body></html>';

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    public function openApi(Request $request): JsonResponse
    {
        $webBase = InstallerWebBase::detect();

        return response()->json($this->openApiDocument->build($webBase));
    }

    public function asset(string $asset): Response
    {
        $path = $this->resolveSwaggerAssetPath($asset);
        if (! is_readable($path)) {
            return response()->json([
                'error' => 'Swagger UI asset is missing.',
                'code' => 'docs_unavailable',
            ], 503);
        }

        return response(File::get($path), 200, [
            'Content-Type' => $this->contentTypeFor($asset),
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private function contentTypeFor(string $asset): string
    {
        return match ($asset) {
            'swagger-ui.css' => 'text/css; charset=utf-8',
            'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js' => 'application/javascript; charset=utf-8',
            'favicon-32x32.png', 'favicon-16x16.png' => 'image/png',
            default => 'application/octet-stream',
        };
    }

    private function resolveSwaggerAssetPath(string $file): string
    {
        $candidates = [
            base_path('vendor/swagger-api/swagger-ui/dist/'.$file),
            dirname(__DIR__, 4).'/vendor/swagger-api/swagger-ui/dist/'.$file,
        ];
        foreach ($candidates as $candidate) {
            if (is_readable($candidate)) {
                return $candidate;
            }
        }

        return $candidates[0];
    }
}
