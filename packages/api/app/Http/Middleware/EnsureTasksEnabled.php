<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\WgwSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureTasksEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $cfg = WgwSettings::normalized();
        if (! (bool) ($cfg[WgwSettings::CALENDAR_ENABLED] ?? true)) {
            return response()->json(['error' => 'Tasks are disabled.'], 403);
        }

        return $next($request);
    }
}
