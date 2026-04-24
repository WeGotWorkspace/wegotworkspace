<?php

declare(strict_types=1);

namespace App\Filegator;

use Filegator\Controllers\FileController;
use Filegator\Kernel\Request;
use Filegator\Kernel\Response;

/**
 * Filename-only search across the authenticated user's visible tree (same Flysystem ACL as listing).
 */
final class DriveSearchController extends FileController
{
    public function searchFiles(Request $request, Response $response): void
    {
        $raw = trim((string) $request->input('q', ''));
        $q = function_exists('mb_strtolower') ? mb_strtolower($raw, 'UTF-8') : strtolower($raw);
        $qLen = function_exists('mb_strlen') ? mb_strlen($raw, 'UTF-8') : strlen($raw);
        if ($q === '' || $qLen < 2) {
            $response->json([
                'location' => $this->separator,
                'files' => [],
            ]);

            return;
        }

        $limit = (int) $request->input('limit', 50);
        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $user = $this->auth->user() ?: $this->auth->getGuest();
        $root = FilegatorPathGuard::sanitize($this->separator, $this->separator, $user);

        try {
            $collection = $this->storage->getDirectoryCollection($root, true);
        } catch (\Throwable) {
            $response->json([
                'location' => $this->separator,
                'files' => [],
            ]);

            return;
        }

        $serialized = $collection->jsonSerialize();
        /** @var list<array{type?:string,path?:string,name?:string,size?:int,time?:int,permissions?:int}> $all */
        $all = $serialized['files'] ?? [];

        $candidates = [];
        foreach ($all as $item) {
            if (($item['type'] ?? '') !== 'dir' && ($item['type'] ?? '') !== 'file') {
                continue;
            }
            $name = (string) ($item['name'] ?? '');
            if ($name === '' || $name === $this->separator) {
                continue;
            }
            $n = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
            if (!str_contains($n, $q)) {
                continue;
            }
            $candidates[] = $item;
            if (count($candidates) >= 400) {
                break;
            }
        }

        usort(
            $candidates,
            static function (array $a, array $b) use ($q): int {
                $an = function_exists('mb_strtolower') ? mb_strtolower((string) ($a['name'] ?? ''), 'UTF-8') : strtolower((string) ($a['name'] ?? ''));
                $bn = function_exists('mb_strtolower') ? mb_strtolower((string) ($b['name'] ?? ''), 'UTF-8') : strtolower((string) ($b['name'] ?? ''));
                $ap = str_starts_with($an, $q) ? 0 : 1;
                $bp = str_starts_with($bn, $q) ? 0 : 1;
                if ($ap !== $bp) {
                    return $ap <=> $bp;
                }
                $at = ($a['type'] ?? '') === 'dir' ? 0 : 1;
                $bt = ($b['type'] ?? '') === 'dir' ? 0 : 1;
                if ($at !== $bt) {
                    return $at <=> $bt;
                }

                return strnatcasecmp($an, $bn);
            },
        );

        $response->json([
            'location' => $root,
            'files' => array_slice($candidates, 0, $limit),
        ]);
    }
}
