<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\DisciplineController;
use App\Http\Controllers\Api\V1\ModuleController;
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
|
*/

Route::prefix('v1')->group(function (): void {

    // --- Autenticação -----------------------------------------------------
    // Throttle apertado: estes são os endpoints que um ataque de força bruta
    // procura primeiro.
    Route::middleware('throttle:6,1')->group(function (): void {
        Route::post('auth/register', RegisterController::class);
        Route::post('auth/login', LoginController::class);
    });

    // --- Catálogo público -------------------------------------------------
    // Sem autenticação: o catálogo é a vitrine da plataforma. As policies
    // continuam filtrando o que não está publicado.
    Route::get('disciplines', [DisciplineController::class, 'index']);
    Route::get('disciplines/{discipline}', [DisciplineController::class, 'show']);

    Route::get('modules', [ModuleController::class, 'index']);
    Route::get('modules/{module}', [ModuleController::class, 'show']);

    Route::get('projects', [ProjectController::class, 'index']);
    Route::get('projects/{project}', [ProjectController::class, 'show']);

    // Execução compartilhada por link — a policy decide se é pública.
    Route::get('simulation-runs/{simulationRun}', [SimulationRunController::class, 'show']);

    // --- Área autenticada -------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', LogoutController::class);
        Route::get('me', MeController::class);

        Route::get('me/simulation-runs', [SimulationRunController::class, 'index']);
        Route::post('simulation-runs', [SimulationRunController::class, 'store']);
    });
});
