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

    $this->post = Post::factory()->published()->create();
});

/** Ver a nota em CommentTest sobre `forgetGuards`. */
function autenticado(User $user): mixed
{
    app('auth')->forgetGuards();

    return test()->withToken($user->createToken('web')->plainTextToken);
}

function membro(): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::Member->value);

    return $user;
}

it('curte e descurte um post no mesmo endpoint', function () {
    $user = membro();

    // Um botão só, um endpoint só: o cliente que perde a resposta do primeiro
    // clique consulta de novo e recebe a verdade, em vez de ficar invertido.
    autenticado($user)->postJson("/api/v1/posts/{$this->post->slug}/like")
        ->assertOk()
        ->assertJsonPath('data.liked', true)
        ->assertJsonPath('data.likesCount', 1);

    autenticado($user)->postJson("/api/v1/posts/{$this->post->slug}/like")
        ->assertOk()
        ->assertJsonPath('data.liked', false)
        ->assertJsonPath('data.likesCount', 0);
});

it('conta uma curtida por pessoa, não por clique', function () {
    $a = membro();
    $b = membro();

    autenticado($a)->postJson("/api/v1/posts/{$this->post->slug}/like");
    autenticado($b)->postJson("/api/v1/posts/{$this->post->slug}/like");

    expect($this->post->likes()->count())->toBe(2);
});

it('curte um comentário', function () {
    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    autenticado(membro())->postJson("/api/v1/comments/{$comment->id}/like")
        ->assertOk()
        ->assertJsonPath('data.liked', true)
        ->assertJsonPath('data.likesCount', 1);
});

it('exige conta para curtir', function () {
    $this->postJson("/api/v1/posts/{$this->post->slug}/like")->assertUnauthorized();
});

it('exige e-mail confirmado para curtir', function () {
    $user = User::factory()->unverified()->create();
    $user->assignRole(Role::Member->value);

    autenticado($user)->postJson("/api/v1/posts/{$this->post->slug}/like")
        ->assertStatus(403)
        ->assertJsonPath('type', 'https://orbital.local/problems/email-not-verified');
});

it('mostra ao leitor logado se ele já curtiu', function () {
    $user = membro();

    autenticado($user)->postJson("/api/v1/posts/{$this->post->slug}/like");

    autenticado($user)->getJson("/api/v1/posts/{$this->post->slug}")
        ->assertOk()
        ->assertJsonPath('data.liked', true)
        ->assertJsonPath('data.likesCount', 1);
});

it('não promete estado de curtida para quem não está logado', function () {
    $user = membro();
    autenticado($user)->postJson("/api/v1/posts/{$this->post->slug}/like");

    // `withToken` fixa o cabeçalho na instância do teste: sem limpar, a
    // requisição seguinte continuaria autenticada, e este teste mediria o
    // contrário do que promete.
    $this->flushHeaders();
    app('auth')->forgetGuards();

    $this->getJson("/api/v1/posts/{$this->post->slug}")
        ->assertOk()
        // A contagem é pública; `liked` é sobre alguém, e não há ninguém.
        ->assertJsonPath('data.likesCount', 1)
        ->assertJsonPath('data.liked', false);
});

it('não conta comentário oculto no total do post', function () {
    Comment::factory()->create(['post_id' => $this->post->id]);
    Comment::factory()->hidden()->create(['post_id' => $this->post->id]);

    // Comentário tirado do ar pela moderação não pode inflar o número que a
    // página mostra.
    $this->getJson("/api/v1/posts/{$this->post->slug}")
        ->assertOk()
        ->assertJsonPath('data.commentsCount', 1);
});

it('não deixa curtir rascunho alheio', function () {
    $rascunho = Post::factory()->create();

    autenticado(membro())->postJson("/api/v1/posts/{$rascunho->slug}/like")
        ->assertNotFound();
});
