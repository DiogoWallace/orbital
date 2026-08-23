<?php

declare(strict_types=1);

use App\Domain\Community\Enums\CommentStatus;
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

/** Um leitor comum, com e-mail confirmado. */
function leitor(): User
{
    $user = User::factory()->create();
    $user->assignRole(Role::Member->value);

    return $user;
}

function comoLeitor(User $user): mixed
{
    /*
     * `forgetGuards` antes de trocar de identidade.
     *
     * O guard do Sanctum guarda em memória o usuário que resolveu, e dentro de
     * um teste a aplicação é a mesma entre requisições: sem esquecer o guard, a
     * segunda chamada continua enxergando a primeira pessoa, e um curador
     * aparece como leitor comum.
     *
     * Em produção o problema não existe — cada requisição é um processo novo.
     * É por isso que ele só aparece em teste que troca de usuário no meio.
     */
    app('auth')->forgetGuards();

    return test()->withToken($user->createToken('web')->plainTextToken);
}

it('publica um comentário e ele aparece na hora', function () {
    $user = leitor();

    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", ['body' => 'Ótimo texto.'])
        ->assertCreated()
        ->assertJsonPath('data.body', 'Ótimo texto.')
        ->assertJsonPath('data.author.username', $user->username);

    // Moderação é posterior à publicação (ADR 0013): nada de fila.
    expect($this->getJson("/api/v1/posts/{$this->post->slug}/comments")->json('data'))
        ->toHaveCount(1);
});

it('exige conta para comentar', function () {
    $this->postJson("/api/v1/posts/{$this->post->slug}/comments", ['body' => 'Anônimo.'])
        ->assertUnauthorized();
});

it('exige e-mail confirmado para comentar', function () {
    $user = User::factory()->unverified()->create();
    $user->assignRole(Role::Member->value);

    // Mesma porta da gravação de simulação: o que fica público sob um nome
    // espera a confirmação de que o endereço é de quem escreveu.
    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", ['body' => 'Sem confirmar.'])
        ->assertStatus(403)
        ->assertJsonPath('type', 'https://orbital.local/problems/email-not-verified');
});

it('recusa comentário vazio ou gigante', function () {
    $user = leitor();

    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", ['body' => 'a'])
        ->assertStatus(422);

    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", ['body' => str_repeat('a', 2001)])
        ->assertStatus(422);
});

it('responde a um comentário, em uma camada', function () {
    $user = leitor();
    $raiz = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", [
            'body' => 'Concordo.',
            'parentId' => $raiz->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.parentId', $raiz->id);
});

it('achata a resposta de uma resposta na mesma camada', function () {
    $user = leitor();
    $raiz = Comment::factory()->create(['post_id' => $this->post->id]);
    $resposta = Comment::factory()->replyTo($raiz)->create();

    // Responder a uma resposta prende no comentário raiz: sem isso a árvore
    // afunda e, no celular, a quinta camada tem três palavras por linha.
    comoLeitor($user)
        ->postJson("/api/v1/posts/{$this->post->slug}/comments", [
            'body' => 'Também acho.',
            'parentId' => $resposta->id,
        ])
        ->assertCreated()
        ->assertJsonPath('data.parentId', $raiz->id);
});

it('entrega o fio em duas camadas', function () {
    $raiz = Comment::factory()->create(['post_id' => $this->post->id]);
    Comment::factory()->replyTo($raiz)->create();
    Comment::factory()->replyTo($raiz)->create();

    $resposta = $this->getJson("/api/v1/posts/{$this->post->slug}/comments")->assertOk();

    expect($resposta->json('data'))->toHaveCount(1)
        ->and($resposta->json('data.0.replies'))->toHaveCount(2);
});

it('esconde do público o comentário ocultado pela moderação', function () {
    Comment::factory()->create(['post_id' => $this->post->id, 'body' => 'Visível']);
    Comment::factory()->hidden()->create(['post_id' => $this->post->id, 'body' => 'Oculto']);

    $fio = $this->getJson("/api/v1/posts/{$this->post->slug}/comments")->json('data');

    expect($fio)->toHaveCount(1)
        ->and($fio[0]['body'])->toBe('Visível');
});

it('deixa o autor editar, e marca que foi editado', function () {
    $user = leitor();
    $comment = Comment::factory()->create(['post_id' => $this->post->id, 'user_id' => $user->id]);

    comoLeitor($user)
        ->patchJson("/api/v1/comments/{$comment->id}", ['body' => 'Corrigindo o que escrevi.'])
        ->assertOk()
        ->assertJsonPath('data.body', 'Corrigindo o que escrevi.');

    // Numa conversa pública, editar depois de alguém responder muda o sentido
    // da resposta alheia. A marca é o mínimo de honestidade.
    expect($comment->fresh()->edited_at)->not->toBeNull();
});

it('não deixa ninguém editar comentário alheio', function () {
    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor(leitor())
        ->patchJson("/api/v1/comments/{$comment->id}", ['body' => 'Sequestrado.'])
        ->assertForbidden();
});

it('não deixa nem a curadoria reescrever palavra alheia', function () {
    $curador = User::factory()->create();
    $curador->assignRole(Role::Admin->value);

    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    // Curadoria oculta, não reescreve: mudar o texto de alguém sob o nome
    // dessa pessoa é pior do que tirar do ar.
    comoLeitor($curador)
        ->patchJson("/api/v1/comments/{$comment->id}", ['body' => 'Editado pela moderação.'])
        ->assertForbidden();
});

it('deixa o autor apagar o próprio comentário', function () {
    $user = leitor();
    $comment = Comment::factory()->create(['post_id' => $this->post->id, 'user_id' => $user->id]);

    comoLeitor($user)->deleteJson("/api/v1/comments/{$comment->id}")->assertNoContent();

    expect($comment->fresh()->trashed())->toBeTrue();
});

it('deixa a curadoria ocultar e devolver ao ar', function () {
    $curador = User::factory()->create();
    $curador->assignRole(Role::Admin->value);

    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor($curador)
        ->patchJson("/api/v1/comments/{$comment->id}/moderation", ['status' => 'hidden'])
        ->assertOk();

    expect($comment->fresh()->status)->toBe(CommentStatus::Hidden);

    comoLeitor($curador)
        ->patchJson("/api/v1/comments/{$comment->id}/moderation", ['status' => 'visible'])
        ->assertOk();

    expect($comment->fresh()->status)->toBe(CommentStatus::Visible);
});

it('não deixa leitor comum moderar', function () {
    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor(leitor())
        ->patchJson("/api/v1/comments/{$comment->id}/moderation", ['status' => 'hidden'])
        ->assertForbidden();
});

it('registra denúncia, uma por pessoa', function () {
    $user = leitor();
    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor($user)
        ->postJson("/api/v1/comments/{$comment->id}/report", ['reason' => 'spam'])
        ->assertOk();

    comoLeitor($user)
        ->postJson("/api/v1/comments/{$comment->id}/report", ['reason' => 'abuse'])
        ->assertOk();

    // Dez cliques da mesma pessoa não podem pesar como dez pessoas.
    expect($comment->reports()->count())->toBe(1)
        ->and($comment->reports()->first()->reason->value)->toBe('abuse');
});

it('não deixa denunciar o próprio comentário', function () {
    $user = leitor();
    $comment = Comment::factory()->create(['post_id' => $this->post->id, 'user_id' => $user->id]);

    comoLeitor($user)
        ->postJson("/api/v1/comments/{$comment->id}/report", ['reason' => 'spam'])
        ->assertForbidden();
});

it('marca as denúncias como revisadas ao moderar', function () {
    $curador = User::factory()->create();
    $curador->assignRole(Role::Admin->value);

    $comment = Comment::factory()->create(['post_id' => $this->post->id]);

    comoLeitor(leitor())
        ->postJson("/api/v1/comments/{$comment->id}/report", ['reason' => 'spam'])
        ->assertOk();

    comoLeitor($curador)
        ->patchJson("/api/v1/comments/{$comment->id}/moderation", ['status' => 'hidden'])
        ->assertOk();

    // Fila que não esvazia sozinha vira fila que ninguém abre.
    expect($comment->reports()->whereNull('reviewed_at')->count())->toBe(0);
});

it('não deixa comentar em rascunho alheio', function () {
    $rascunho = Post::factory()->create();

    comoLeitor(leitor())
        ->postJson("/api/v1/posts/{$rascunho->slug}/comments", ['body' => 'Espiando.'])
        ->assertNotFound();
});
