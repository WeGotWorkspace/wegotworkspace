<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'wgw.auth' => \App\Http\Middleware\AuthenticateWgwApi::class,
            'wgw.role' => \App\Http\Middleware\RequireWgwRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\App\Services\Mail\MailResponseException $e) {
            return response()->json($e->payload, $e->status);
        });
        $exceptions->render(function (\App\Exceptions\ApiHttpException $e) {
            $payload = ['error' => $e->getMessage()];
            if ($e->errorCode() !== null) {
                $payload['code'] = $e->errorCode();
            }

            return response()->json($payload, $e->getStatusCode());
        });
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e) {
            $message = $e->validator->errors()->first() ?? 'Invalid request.';

            return response()->json([
                'error' => $message,
                'code' => 'bad_request',
            ], 400);
        });
    })
    ->create();
