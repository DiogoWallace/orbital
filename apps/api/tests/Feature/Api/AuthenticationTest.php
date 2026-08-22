<?php

declare(strict_types=1);

use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }
});

it('registra um usuário e devolve token', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@orbital.local',
        'password' => 'senha-muito-segura-1',
        'password_confirmation' => 'senha-muito-segura-1',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.user.email', 'ada@orbital.local')
        ->assertJsonStructure(['data' => ['token']]);

    expect(User::where('email', 'ada@orbital.local')->first()->hasRole(Role::Member->value))
        ->toBeTrue();
});

it('nunca devolve a senha no payload', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'ada2@orbital.local',
        'password' => 'senha-muito-segura-1',
        'password_confirmation' => 'senha-muito-segura-1',
    ])->assertCreated()->assertJsonMissingPath('data.user.password');
});

it('autentica com credenciais válidas', function () {
    $user = User::factory()->create(['email' => 'curie@orbital.local']);
    $user->assignRole(Role::Member->value);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'curie@orbital.local',
        'password' => 'password',
    ])->assertOk()->assertJsonStructure(['data' => ['token', 'user']]);
});

it('usa a mesma mensagem para e-mail inexistente e senha errada', function () {
    User::factory()->create(['email' => 'existe@orbital.local']);

    $comUsuario = $this->postJson('/api/v1/auth/login', [
        'email' => 'existe@orbital.local',
        'password' => 'errada',
    ])->assertStatus(422);

    $semUsuario = $this->postJson('/api/v1/auth/login', [
        'email' => 'nao-existe@orbital.local',
        'password' => 'errada',
    ])->assertStatus(422);

    expect($comUsuario->json('errors.email'))
        ->toBe($semUsuario->json('errors.email'));
});

it('protege a rota /me', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

it('revoga apenas o token da sessão atual no logout', function () {
    $user = User::factory()->create();

    $tokenA = $user->createToken('web')->plainTextToken;
    $user->createToken('celular');

    $this->withToken($tokenA)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect($user->tokens()->count())->toBe(1)
        ->and($user->tokens()->first()->name)->toBe('celular');
});
