<?php

declare(strict_types=1);

use App\Domain\Community\Models\Comment;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }
});

function comConta(User $user): mixed
{
    app('auth')->forgetGuards();

    return test()->withToken($user->createToken('web')->plainTextToken);
}

it('abre o perfil público pelo username', function () {
    $user = User::factory()->create([
        'name' => 'Ada Lovelace',
        'username' => 'ada',
        'bio' => 'Escrevo sobre máquinas analíticas.',
    ]);
    $user->assignRole(Role::Member->value);

    $this->getJson('/api/v1/profiles/ada')
        ->assertOk()
        ->assertJsonPath('data.username', 'ada')
        ->assertJsonPath('data.name', 'Ada Lovelace')
        ->assertJsonPath('data.bio', 'Escrevo sobre máquinas analíticas.');
});

it('nunca expõe o e-mail no perfil público', function () {
    User::factory()->create(['username' => 'ada2', 'email' => 'ada@orbital.local']);

    $resposta = $this->getJson('/api/v1/profiles/ada2')->assertOk();

    // Nem o endereço, nem hash dele: hash de e-mail é reversível por
    // dicionário e serve de identificador cruzado entre sites.
    expect(json_encode($resposta->json()))->not->toContain('ada@orbital.local')
        ->and($resposta->json('data'))->not->toHaveKey('email');
});

it('não expõe o que a pessoa curtiu', function () {
    $user = User::factory()->create(['username' => 'ada3']);
    $post = Post::factory()->published()->create();

    $user->likes()->create(['likeable_type' => $post::class, 'likeable_id' => $post->id]);

    // Curtida é histórico de leitura. Expor transforma um gesto barato em
    // declaração pública, que não foi o que a pessoa fez.
    $resposta = $this->getJson('/api/v1/profiles/ada3')->assertOk();

    expect($resposta->json('data'))->not->toHaveKey('likes')
        ->and($resposta->json('data'))->not->toHaveKey('likedPosts');
});

it('lista os comentários visíveis da pessoa', function () {
    $user = User::factory()->create(['username' => 'ada4']);
    $post = Post::factory()->published()->create();

    Comment::factory()->create(['user_id' => $user->id, 'post_id' => $post->id, 'body' => 'Visível']);
    Comment::factory()->hidden()->create(['user_id' => $user->id, 'post_id' => $post->id]);

    $resposta = $this->getJson('/api/v1/profiles/ada4')->assertOk();

    expect($resposta->json('data.comments'))->toHaveCount(1)
        ->and($resposta->json('data.comments.0.body'))->toBe('Visível')
        ->and($resposta->json('data.commentsCount'))->toBe(1);
});

it('responde 404 para username que não existe', function () {
    $this->getJson('/api/v1/profiles/ninguem')->assertNotFound();
});

it('deixa a pessoa trocar o próprio username e a bio', function () {
    $user = User::factory()->create(['username' => 'antigo']);
    $user->assignRole(Role::Member->value);

    comConta($user)->patchJson('/api/v1/me/profile', [
        'username' => 'novo_nome',
        'bio' => 'Física de foguetes nas horas vagas.',
    ])
        ->assertOk()
        ->assertJsonPath('data.username', 'novo_nome');

    // O link do perfil acompanha a troca; é por isso que o endereço é o
    // username e não o nome de exibição.
    $this->getJson('/api/v1/profiles/novo_nome')->assertOk();
});

it('recusa username já em uso', function () {
    User::factory()->create(['username' => 'ocupado']);

    $user = User::factory()->create();
    $user->assignRole(Role::Member->value);

    comConta($user)->patchJson('/api/v1/me/profile', ['username' => 'ocupado'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('username');
});

it('recusa username com maiúscula, espaço ou ponto', function () {
    $user = User::factory()->create();
    $user->assignRole(Role::Member->value);

    foreach (['Ada', 'ada lovelace', 'ada.lovelace', 'ad'] as $invalido) {
        comConta($user)->patchJson('/api/v1/me/profile', ['username' => $invalido])
            ->assertStatus(422);
    }
});

it('aceita o próprio username sem reclamar de duplicidade', function () {
    $user = User::factory()->create(['username' => 'ada5']);
    $user->assignRole(Role::Member->value);

    // Salvar o formulário sem mexer no campo não pode ser um erro.
    comConta($user)->patchJson('/api/v1/me/profile', [
        'username' => 'ada5',
        'bio' => 'Só mudei a bio.',
    ])->assertOk();
});

it('gera username automaticamente no cadastro', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Grace Hopper',
        'email' => 'grace@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertCreated();

    // Ninguém escolhe apelido no meio do cadastro.
    expect(User::where('email', 'grace@orbital.local')->first()->username)
        ->toBe('gracehopper');
});

it('desempata username repetido com número', function () {
    User::factory()->create(['username' => 'gracehopper']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Grace Hopper',
        'email' => 'grace2@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertCreated();

    expect(User::where('email', 'grace2@orbital.local')->first()->username)
        ->toBe('gracehopper2');
});
