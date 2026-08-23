<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\ExchangeTicketController;
use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\GoogleCallbackController;
use App\Http\Controllers\Api\V1\Auth\GoogleRedirectController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResendVerificationController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
use App\Http\Controllers\Api\V1\DisciplineController;
use App\Http\Controllers\Api\V1\ModuleController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\SimulationRunController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
|
| Contrato público da plataforma (ADR 0002). O prefixo `/api` é aplicado pelo
| bootstrap; aqui declaramos apenas a versão.
|
| O consumidor esperado é o BFF do Next (ADR 0004) — nunca o browser direto.
| As duas exceções são o redirect e o callback do Google, que por natureza são
| navegação do usuário (ADR 0011).
|
*/

Route::prefix('v1')->group(function (): void {

    // --- Autenticação -----------------------------------------------------
    // Throttle apertado: estes são os endpoints que um ataque de força bruta
    // procura primeiro.
    Route::middleware('throttle:6,1')->group(function (): void {
        Route::post('auth/login', LoginController::class);
        Route::post('auth/reset-password', ResetPasswordController::class);
        Route::post('auth/email/verify', VerifyEmailController::class);
    });

    // Balde próprio e mais estreito para o que dispara e-mail. Cada requisição
    // aqui manda uma mensagem para uma caixa que não é a de quem pediu — sem
    // limite, viram ferramenta gratuita de importunar terceiros a partir do
    // nosso domínio.
    Route::middleware('throttle:5,10')->group(function (): void {
        Route::post('auth/register', RegisterController::class);
        Route::post('auth/forgot-password', ForgotPasswordController::class);
    });

    // --- Login com o Google -----------------------------------------------
    // Duas rotas de navegação e uma de troca. O token nunca aparece na URL:
    // o callback redireciona com um ticket de uso único, que só o BFF resgata.
    Route::middleware('throttle:20,1')->group(function (): void {
        Route::get('auth/google/redirect', GoogleRedirectController::class);
        Route::get('auth/google/callback', GoogleCallbackController::class);
        Route::post('auth/exchange', ExchangeTicketController::class);
    });

    // --- Catálogo e blog públicos -----------------------------------------
    // Sem autenticação: a vitrine precisa abrir para quem não tem conta. As
    // policies continuam filtrando o que não está publicado.
    //
    // `auth.optional` não exige token, mas usa o que vier: é o que permite a
    // um curador logado ver o próprio rascunho por estas mesmas rotas.
    Route::middleware('auth.optional')->group(function (): void {
        Route::get('disciplines', [DisciplineController::class, 'index']);
        Route::get('disciplines/{discipline}', [DisciplineController::class, 'show']);

        Route::get('modules', [ModuleController::class, 'index']);
        Route::get('modules/{module}', [ModuleController::class, 'show']);

        Route::get('projects', [ProjectController::class, 'index']);
        Route::get('projects/{project}', [ProjectController::class, 'show']);

        Route::get('posts', [PostController::class, 'index']);
        Route::get('posts/{post}', [PostController::class, 'show']);

        // Execução compartilhada por link — a policy decide se é pública.
        Route::get('simulation-runs/{simulationRun}', [SimulationRunController::class, 'show']);
    });

    // --- Área autenticada -------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', LogoutController::class);
        Route::get('me', MeController::class);

        Route::get('me/simulation-runs', [SimulationRunController::class, 'index']);

        Route::middleware('throttle:3,10')
            ->post('auth/email/verification-notification', ResendVerificationController::class);

        // --- Escrita: exige e-mail confirmado -----------------------------
        // A porta suave (ADR 0010): sem confirmar, dá para navegar o catálogo
        // e rodar qualquer simulação — o que roda no cliente (ADR 0007) e não
        // custa nada a ninguém. O que fica gravado com um nome e um e-mail
        // junto espera a confirmação de que o endereço é mesmo de quem
        // cadastrou.
        Route::middleware('verified')->group(function (): void {
            Route::post('simulation-runs', [SimulationRunController::class, 'store']);
        });
    });
});
