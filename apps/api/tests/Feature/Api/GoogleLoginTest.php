<?php

declare(strict_types=1);

use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\SocialAccount;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Api\V1\Auth\GoogleRedirectController;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }

    config([
        'services.google.client_id' => 'id-de-teste',
        'services.google.client_secret' => 'segredo-de-teste',
        'services.google.redirect' => 'http://localhost:8100/api/v1/auth/google/callback',
    ]);
});

/** Respostas do Google, nas duas chamadas que o fluxo faz. */
function fingirGoogle(array $perfil = []): void
{
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'token-do-google']),
        'www.googleapis.com/oauth2/v3/userinfo' => Http::response(array_merge([
            'sub' => '1122334455',
            'email' => 'kepler@gmail.com',
            'email_verified' => true,
            'name' => 'Johannes Kepler',
        ], $perfil)),
    ]);
}

/** Percorre o callback com o cookie de state casando com a query. */
function voltarDoGoogle(string $state = 'estado-valido'): TestResponse
{
    return test()
        ->withUnencryptedCookie(GoogleRedirectController::STATE_COOKIE, $state)
        ->get('/api/v1/auth/google/callback?code=codigo-do-google&state='.$state);
}

it('manda o navegador para o Google com escopo mínimo', function () {
    $response = $this->get('/api/v1/auth/google/redirect');

    $response->assertRedirectContains('accounts.google.com');
    $destino = $response->headers->get('Location');

    parse_str((string) parse_url((string) $destino, PHP_URL_QUERY), $query);

    expect($query['scope'])->toBe('openid email profile')
        ->and($query['response_type'])->toBe('code')
        ->and($query['state'])->not->toBeEmpty();

    // O `state` também vai em cookie: é o que amarra a volta a este navegador.
    $response->assertCookie(GoogleRedirectController::STATE_COOKIE);
});

it('responde 503 quando não há credenciais configuradas', function () {
    config(['services.google.client_id' => null]);

    $this->getJson('/api/v1/auth/google/redirect')->assertStatus(503);
});

it('cria a conta na primeira entrada, já verificada', function () {
    fingirGoogle();

    voltarDoGoogle()->assertRedirectContains('/api/auth/google/callback?ticket=');

    $user = User::where('email', 'kepler@gmail.com')->firstOrFail();

    expect($user->name)->toBe('Johannes Kepler')
        ->and($user->password)->toBeNull()
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and($user->hasRole(Role::Member->value))->toBeTrue()
        ->and($user->socialAccounts()->where('provider', 'google')->count())->toBe(1);
});

it('reconhece quem já entrou antes, sem duplicar conta', function () {
    fingirGoogle();

    voltarDoGoogle();
    voltarDoGoogle();

    expect(User::where('email', 'kepler@gmail.com')->count())->toBe(1)
        ->and(SocialAccount::where('provider_id', '1122334455')->count())->toBe(1);
});

it('liga à conta local existente quando o Google confirma o endereço', function () {
    $existente = User::factory()->create([
        'email' => 'kepler@gmail.com',
        'email_verified_at' => null,
    ]);

    fingirGoogle();
    voltarDoGoogle();

    expect(SocialAccount::where('user_id', $existente->id)->count())->toBe(1)
        // O Google provou a posse do endereço, então a conta local pendente
        // passa a valer como confirmada.
        ->and($existente->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and(User::where('email', 'kepler@gmail.com')->count())->toBe(1);
});

it('recusa ligar quando o Google não confirmou o endereço', function () {
    $existente = User::factory()->create(['email' => 'kepler@gmail.com']);

    fingirGoogle(['email_verified' => false]);

    // Sem essa trava, bastaria criar conta no provedor com o e-mail de outra
    // pessoa para assumir a conta dela aqui.
    voltarDoGoogle()->assertRedirectContains('/login?erro=falhou');

    expect(SocialAccount::where('user_id', $existente->id)->count())->toBe(0);
});

it('recusa a volta quando o state não bate com o cookie', function () {
    fingirGoogle();

    $this->withUnencryptedCookie(GoogleRedirectController::STATE_COOKIE, 'um-estado')
        ->get('/api/v1/auth/google/callback?code=codigo&state=outro-estado')
        ->assertRedirectContains('/login?erro=estado');

    expect(User::where('email', 'kepler@gmail.com')->count())->toBe(0);
});

it('recusa a volta sem cookie de state', function () {
    fingirGoogle();

    $this->get('/api/v1/auth/google/callback?code=codigo&state=qualquer')
        ->assertRedirectContains('/login?erro=estado');
});

it('leva de volta ao login quando o usuário cancela no Google', function () {
    $this->get('/api/v1/auth/google/callback?error=access_denied&state=x')
        ->assertRedirectContains('/login?erro=cancelado');
});

it('nunca coloca o token de acesso na URL do redirect', function () {
    fingirGoogle();

    $destino = (string) voltarDoGoogle()->headers->get('Location');
    parse_str((string) parse_url($destino, PHP_URL_QUERY), $query);

    $guardado = User::where('email', 'kepler@gmail.com')->firstOrFail()->tokens()->firstOrFail();

    expect(array_keys($query))->toBe(['ticket'])
        // O token do Sanctum viaja como "id|texto"; a barra vertical é a
        // assinatura do formato, e ela não pode aparecer na URL.
        ->and($destino)->not->toContain('|')
        ->and($query['ticket'])->not->toBe($guardado->token);
});

it('troca o ticket por um token de verdade, uma vez só', function () {
    fingirGoogle();

    $destino = (string) voltarDoGoogle()->headers->get('Location');
    parse_str((string) parse_url($destino, PHP_URL_QUERY), $query);

    $this->postJson('/api/v1/auth/exchange', ['ticket' => $query['ticket']])
        ->assertOk()
        ->assertJsonPath('data.user.email', 'kepler@gmail.com')
        ->assertJsonStructure(['data' => ['token']]);

    // Uso único: o mesmo ticket não serve duas vezes.
    $this->postJson('/api/v1/auth/exchange', ['ticket' => $query['ticket']])
        ->assertStatus(422);
});

it('o token trocado abre a área autenticada', function () {
    fingirGoogle();

    $destino = (string) voltarDoGoogle()->headers->get('Location');
    parse_str((string) parse_url($destino, PHP_URL_QUERY), $query);

    $token = $this->postJson('/api/v1/auth/exchange', ['ticket' => $query['ticket']])
        ->json('data.token');

    $this->withToken($token)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'kepler@gmail.com');
});

it('recusa ticket inventado', function () {
    $this->postJson('/api/v1/auth/exchange', ['ticket' => 'nao-existe'])->assertStatus(422);
});

it('não deixa entrar com senha em conta criada pelo Google', function () {
    fingirGoogle();
    voltarDoGoogle();

    // Conta sem senha: a tentativa cai no mesmo erro genérico de sempre, sem
    // revelar que aquele e-mail existe e entra por outro caminho.
    $this->postJson('/api/v1/auth/login', [
        'email' => 'kepler@gmail.com',
        'password' => 'qualquer-senha-1234',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('permite recuperar senha para assumir a conta criada pelo Google', function () {
    fingirGoogle();
    voltarDoGoogle();

    // Caminho legítimo para quem quer parar de depender do provedor: o
    // endereço já está confirmado, então o link chega em uma caixa comprovada.
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'kepler@gmail.com'])
        ->assertOk();
});
