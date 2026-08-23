<?php

declare(strict_types=1);

use App\Domain\Catalog\Models\Discipline;
use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Spatie\Permission\Models\Role as SpatieRole;

it('lista apenas módulos publicados', function () {
    Module::factory()->published()->create(['title' => 'Visível']);
    Module::factory()->create(['title' => 'Rascunho']);

    $response = $this->getJson('/api/v1/modules');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Visível');
});

it('esconde módulo com publicação agendada para o futuro', function () {
    Module::factory()->scheduled()->create();

    $this->getJson('/api/v1/modules')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('filtra por disciplina', function () {
    $astronomia = Discipline::factory()->create(['slug' => 'astronomia']);
    $quimica = Discipline::factory()->create(['slug' => 'quimica']);

    Module::factory()->published()->for($astronomia)->create(['title' => 'Órbitas']);
    Module::factory()->published()->for($quimica)->create(['title' => 'Moléculas']);

    $this->getJson('/api/v1/modules?filter[discipline]=astronomia')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Órbitas');
});

it('recusa filtro não declarado na whitelist', function () {
    Module::factory()->published()->create();

    // spatie/query-builder responde 400 a filtros desconhecidos: nada que o
    // cliente invente chega ao SQL.
    $this->getJson('/api/v1/modules?filter[author_id]=1')
        ->assertStatus(400);
});

it('entrega o spec completo na página do módulo', function () {
    $module = Module::factory()->published()->create([
        'slug' => 'laboratorio-orbital',
        'spec' => ['version' => '1.0.0', 'parameters' => [['key' => 'massa']]],
    ]);

    $this->getJson("/api/v1/modules/{$module->slug}")
        ->assertOk()
        ->assertJsonPath('data.spec.parameters.0.key', 'massa')
        ->assertJsonPath('data.componentKey', $module->component_key);
});

it('responde 404 — e não 403 — para módulo não publicado', function () {
    $module = Module::factory()->create(['slug' => 'segredo']);

    $this->getJson("/api/v1/modules/{$module->slug}")->assertNotFound();
});

it('mostra rascunho para a curadoria', function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }

    $curator = User::factory()->create();
    $curator->assignRole(Role::Curator->value);

    $module = Module::factory()->create(['slug' => 'em-preparo']);

    $this->actingAs($curator)
        ->getJson("/api/v1/modules/{$module->slug}")
        ->assertOk()
        ->assertJsonPath('data.slug', 'em-preparo');
});

it('devolve erro em formato problem+json', function () {
    $this->getJson('/api/v1/modules/nao-existe')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonStructure(['type', 'title', 'status', 'detail', 'instance']);
});

it('mostra rascunho para a curadoria pelo token, e não só por actingAs', function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }

    $curator = User::factory()->create();
    $curator->assignRole(Role::Curator->value);

    $module = Module::factory()->create(['slug' => 'em-preparo-token']);

    // `actingAs()` popula o guard padrão direto e nunca exercita o caminho do
    // token — foi o que escondeu, por três semanas, o fato de a rota pública
    // ignorar o Authorization e tratar todo mundo como anônimo (ADR 0012).
    $this->withToken($curator->createToken('web')->plainTextToken)
        ->getJson('/api/v1/modules/em-preparo-token')
        ->assertOk()
        ->assertJsonPath('data.slug', 'em-preparo-token');
});

it('inclui rascunho na listagem para a curadoria autenticada por token', function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }

    $curator = User::factory()->create();
    $curator->assignRole(Role::Curator->value);

    Module::factory()->create(['slug' => 'rascunho-na-listagem']);

    $slugs = collect(
        $this->withToken($curator->createToken('web')->plainTextToken)
            ->getJson('/api/v1/modules')
            ->json('data')
    )->pluck('slug');

    expect($slugs)->toContain('rascunho-na-listagem');
});
