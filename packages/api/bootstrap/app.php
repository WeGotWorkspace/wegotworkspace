<?php

declare(strict_types=1);

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Middleware\RequireWgwRole;
use App\Http\Middleware\WgwSecurityHeaders;
use App\Services\Collab\CollabResponseException;
use App\Services\Mail\MailResponseException;
use App\Services\Voice\VoiceResponseException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
        then: function (): void {
            require __DIR__.'/../routes/docs.php';
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [
            'sabre_ui_auth',
        ]);
        $middleware->alias([
            'wgw.auth' => AuthenticateWgwApi::class,
            'wgw.role' => RequireWgwRole::class,
        ]);
        $middleware->appendToGroup('web', [
            WgwSecurityHeaders::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            '*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (MailResponseException $e) {
            return response()->json($e->payload, $e->status);
        });
        $exceptions->render(function (VoiceResponseException $e) {
            return response()->json($e->payload, $e->status);
        });
        $exceptions->render(function (CollabResponseException $e) {
            return response()->json($e->payload, $e->status);
        });
        $exceptions->render(function (ApiHttpException $e) {
            $payload = ['error' => $e->getMessage()];
            if ($e->errorCode() !== null) {
                $payload['code'] = $e->errorCode();
            }

            return response()->json($payload, $e->getStatusCode());
        });
        $exceptions->render(function (ValidationException $e) {
            $message = $e->validator->errors()->first() ?? 'Invalid request.';

            return response()->json([
                'error' => $message,
                'code' => 'bad_request',
            ], 400);
        });
    })
    ->create();
