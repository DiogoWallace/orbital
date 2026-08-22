<?php

declare(strict_types=1);

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use App\Domain\Simulation\Models\SimulationRun;

it('grava uma execução vinda do cliente', function () {
    $module = Module::factory()->published()->create(['slug' => 'laboratorio-orbital']);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/simulation-runs', [
        'moduleSlug' => 'laboratorio-orbital',
        'label' => 'Órbita de transferência',
        'parameters' => ['altitude' => 400, 'speedFactor' => 1.28],
        'result' => ['summary' => ['apoapsis' => 35786]],
        'modelVersion' => '1.0.0',
    ])->assertCreated()
        ->assertJsonPath('data.parameters.speedFactor', 1.28)
        ->assertJsonPath('data.modelVersion', '1.0.0');

    expect(SimulationRun::where('module_id', $module->id)->count())->toBe(1);
});

it('recusa parâmetros aninhados', function () {
    Module::factory()->published()->create(['slug' => 'laboratorio-orbital']);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/simulation-runs', [
            'moduleSlug' => 'laboratorio-orbital',
            'parameters' => ['payload' => ['profundo' => true]],
            'modelVersion' => '1.0.0',
        ])->assertStatus(422);
});

it('impede gravar execução de módulo não publicado', function () {
    Module::factory()->create(['slug' => 'rascunho']);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/simulation-runs', [
            'moduleSlug' => 'rascunho',
            'parameters' => ['x' => 1],
            'modelVersion' => '1.0.0',
        ])->assertForbidden();
});

it('mantém execução privada fora do alcance de terceiros', function () {
    $run = SimulationRun::factory()->create();

    $this->getJson("/api/v1/simulation-runs/{$run->id}")->assertForbidden();

    $this->actingAs(User::factory()->create())
        ->getJson("/api/v1/simulation-runs/{$run->id}")
        ->assertForbidden();
});

it('permite abrir execução marcada como pública', function () {
    $run = SimulationRun::factory()->public()->create();

    $this->getJson("/api/v1/simulation-runs/{$run->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $run->id);
});
