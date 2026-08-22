<?php

declare(strict_types=1);

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

it('envia o link de recuperação para quem tem conta', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'hopper@orbital.local']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'hopper@orbital.local'])
        ->assertOk()
        ->assertJsonStructure(['data' => ['message']]);

    Notification::assertSentTo($user, ResetPasswordNotification::class);
});

it('responde a mesma coisa para e-mail sem conta, e não envia nada', function () {
    Notification::fake();

    $semConta = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'ninguem@orbital.local']);
    $outroSemConta = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'tambem-nao@orbital.local']);

    // Status e corpo idênticos aos de um endereço cadastrado — é o que impede
    // o formulário de virar um verificador de quem tem conta na plataforma.
    $esperado = 'Se houver uma conta com esse e-mail, o link de recuperação chega em instantes.';

    expect($semConta->status())->toBe(200)
        ->and($semConta->json('data.message'))->toBe($esperado)
        ->and($outroSemConta->json('data.message'))->toBe($esperado);

    Notification::assertNothingSent();
});

it('manda o link para o frontend, não para a API', function () {
    $user = User::factory()->create(['email' => 'noether@orbital.local']);

    $mail = (new ResetPasswordNotification('token-de-teste'))->toMail($user);

    expect($mail->viewData['url'])
        ->toStartWith(config('app.frontend_url').'/redefinir-senha?token=token-de-teste')
        ->toContain(urlencode('noether@orbital.local'))
        // A API tem host próprio em desenvolvimento; se ele aparecer no link,
        // quem clicar cai num JSON em vez de numa página.
        ->not->toContain((string) config('app.url'));
});

it('o e-mail renderiza com o botão e o endereço em texto', function () {
    $user = User::factory()->create(['name' => 'Emmy Noether']);

    $mail = (new ResetPasswordNotification('token-de-teste'))->toMail($user);
    $html = view($mail->view, $mail->viewData)->render();

    expect($html)
        ->toContain('Escolher nova senha')
        ->toContain('Emmy')
        // `e()` porque o Blade escapa o & que separa os dois parâmetros
        // da query — o href sai como &amp;, que é o HTML correto.
        ->toContain(e($mail->viewData['url']))
        // Cliente de e-mail não entende oklch(); a casca precisa estar em hex.
        ->not->toContain('oklch(');
});

it('troca a senha com um token válido', function () {
    $user = User::factory()->create(['email' => 'meitner@orbital.local']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => Password::createToken($user),
        'email' => 'meitner@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertOk();

    expect(Hash::check('orbita-eliptica-2026', $user->fresh()->password))->toBeTrue();
});

it('derruba todas as sessões abertas ao redefinir', function () {
    $user = User::factory()->create(['email' => 'franklin@orbital.local']);
    $user->createToken('web');
    $user->createToken('celular');

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => Password::createToken($user),
        'email' => 'franklin@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertOk();

    // O motivo de redefinir costuma ser suspeita de acesso indevido. Manter
    // sessão antiga de pé anularia a troca.
    expect($user->tokens()->count())->toBe(0);
});

it('considera o e-mail verificado depois do reset', function () {
    $user = User::factory()->create([
        'email' => 'lamarr@orbital.local',
        'email_verified_at' => null,
    ]);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => Password::createToken($user),
        'email' => 'lamarr@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertOk();

    // Clicar no link prova controle da caixa, que é o que a verificação mede.
    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

it('recusa token inválido sem dizer por quê', function () {
    User::factory()->create(['email' => 'goodall@orbital.local']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'token-inventado',
        'email' => 'goodall@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertStatus(422)
        ->assertJsonPath('errors.token.0', 'Este link de recuperação não vale mais. Peça um novo.');
});

it('não aceita o mesmo token duas vezes', function () {
    $user = User::factory()->create(['email' => 'curie2@orbital.local']);

    $payload = [
        'token' => Password::createToken($user),
        'email' => 'curie2@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ];

    $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();
    $this->postJson('/api/v1/auth/reset-password', $payload)->assertStatus(422);
});
