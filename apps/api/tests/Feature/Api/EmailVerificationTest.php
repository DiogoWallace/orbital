<?php

declare(strict_types=1);

use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\VerifyEmailNotification;
use App\Domain\Identity\Support\EmailVerificationTokens;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }
});

it('manda a confirmação assim que a conta é criada', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])->assertCreated();

    Notification::assertSentTo(
        User::where('email', 'ada@orbital.local')->first(),
        VerifyEmailNotification::class,
    );
});

it('deixa entrar sem confirmar — a porta é suave', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'ada2@orbital.local',
        'password' => 'orbita-eliptica-2026',
        'password_confirmation' => 'orbita-eliptica-2026',
    ])
        ->assertCreated()
        // O token vem junto: dá para explorar o catálogo e simular na hora.
        ->assertJsonStructure(['data' => ['token']])
        ->assertJsonPath('data.user.emailVerified', false);
});

it('confirma o e-mail com o token do link', function () {
    $user = User::factory()->create(['email' => 'turing@orbital.local', 'email_verified_at' => null]);
    $token = app(EmailVerificationTokens::class)->issue($user);

    $this->postJson('/api/v1/auth/email/verify', [
        'token' => $token,
        'email' => 'turing@orbital.local',
    ])->assertOk();

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('não exige sessão para confirmar', function () {
    // O link costuma ser aberto no celular, onde não há cookie de sessão.
    $user = User::factory()->create(['email' => 'sagan@orbital.local', 'email_verified_at' => null]);
    $token = app(EmailVerificationTokens::class)->issue($user);

    $this->postJson('/api/v1/auth/email/verify', [
        'token' => $token,
        'email' => 'sagan@orbital.local',
    ])->assertOk();
});

it('queima o token no primeiro uso', function () {
    $user = User::factory()->create(['email' => 'hawking@orbital.local', 'email_verified_at' => null]);
    $token = app(EmailVerificationTokens::class)->issue($user);

    $this->postJson('/api/v1/auth/email/verify', ['token' => $token, 'email' => 'hawking@orbital.local'])
        ->assertOk();

    expect(DB::table('email_verification_tokens')->where('email', 'hawking@orbital.local')->count())
        ->toBe(0);
});

it('perdoa quem clica duas vezes no mesmo link', function () {
    $user = User::factory()->create(['email' => 'bell@orbital.local', 'email_verified_at' => null]);
    $token = app(EmailVerificationTokens::class)->issue($user);

    $payload = ['token' => $token, 'email' => 'bell@orbital.local'];

    $this->postJson('/api/v1/auth/email/verify', $payload)->assertOk();
    // Segunda vez: a conta já está no estado desejado, então não é erro.
    $this->postJson('/api/v1/auth/email/verify', $payload)->assertOk();
});

it('recusa token expirado', function () {
    $user = User::factory()->create(['email' => 'rubin@orbital.local', 'email_verified_at' => null]);
    $token = app(EmailVerificationTokens::class)->issue($user);

    DB::table('email_verification_tokens')
        ->where('email', 'rubin@orbital.local')
        ->update(['created_at' => now()->subMinutes(EmailVerificationTokens::EXPIRE_MINUTES + 1)]);

    $this->postJson('/api/v1/auth/email/verify', ['token' => $token, 'email' => 'rubin@orbital.local'])
        ->assertStatus(422);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('invalida o link anterior quando outro é pedido', function () {
    $user = User::factory()->create(['email' => 'jemison@orbital.local', 'email_verified_at' => null]);

    $tokens = app(EmailVerificationTokens::class);
    $primeiro = $tokens->issue($user);
    $tokens->issue($user);

    // Dois links válidos ao mesmo tempo dobrariam a superfície sem ganho.
    $this->postJson('/api/v1/auth/email/verify', ['token' => $primeiro, 'email' => 'jemison@orbital.local'])
        ->assertStatus(422);
});

it('barra a escrita de quem não confirmou, com um type próprio', function () {
    $user = User::factory()->create(['email_verified_at' => null]);
    $user->assignRole(Role::Member->value);

    $this->withToken($user->createToken('web')->plainTextToken)
        ->postJson('/api/v1/simulation-runs', [])
        ->assertStatus(403)
        ->assertJsonPath('type', 'https://orbital.local/problems/email-not-verified');
});

it('reenvia a confirmação para quem está logado', function () {
    Notification::fake();

    $user = User::factory()->create(['email_verified_at' => null]);

    $this->withToken($user->createToken('web')->plainTextToken)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk();

    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

it('não reenvia para conta já confirmada', function () {
    Notification::fake();

    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->withToken($user->createToken('web')->plainTextToken)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk();

    Notification::assertNothingSent();
});

it('exige senha de pelo menos 12 caracteres no cadastro', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'curta@orbital.local',
        'password' => 'orbita12345',
        'password_confirmation' => 'orbita12345',
    ])->assertStatus(422)->assertJsonValidationErrors('password');
});

it('escreve o erro de senha em português, com inicial maiúscula', function () {
    Notification::fake();

    // `:Attribute` no arquivo de tradução é o que evita "a senha precisa ter
    // pelo menos 12 caracteres." começando em minúscula no meio da interface.
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'maiuscula@orbital.local',
        'password' => 'orbita12345',
        'password_confirmation' => 'orbita12345',
    ])->assertStatus(422)
        ->assertJsonPath('errors.password.0', 'A senha precisa ter pelo menos 12 caracteres.');
});

it('exige letra e número na senha', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada',
        'email' => 'soletras@orbital.local',
        'password' => 'orbitaeliptica',
        'password_confirmation' => 'orbitaeliptica',
    ])->assertStatus(422)->assertJsonValidationErrors('password');
});
