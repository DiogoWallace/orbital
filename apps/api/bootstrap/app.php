<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\ResolveOptionalUser;
use App\Support\Http\ProblemDetails;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // A API é stateless por decisão (ADR 0004): nenhum middleware de sessão
        // ou de CSRF entra no grupo `api`. O token vem no header Authorization,
        // colocado lá pelo BFF do Next.

        // Sobrescreve o alias `verified` do framework: o nosso responde em
        // RFC 7807 com um `type` próprio, em vez de um 403 em inglês.
        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,

            // Rota pública que ainda assim quer saber quem está do outro lado.
            // Ver ResolveOptionalUser: sem isto o token no cabeçalho é
            // ignorado fora do grupo `auth:sanctum`.
            'auth.optional' => ResolveOptionalUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ProblemDetails::fromThrowable($e, $request);
        });
    })->create();
