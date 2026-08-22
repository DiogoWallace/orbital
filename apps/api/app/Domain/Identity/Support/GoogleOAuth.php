<?php

declare(strict_types=1);

namespace App\Domain\Identity\Support;

use App\Domain\Identity\Data\SocialProfileData;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente do Google Identity, escrito à mão.
 *
 * O `laravel/socialite` exige Guzzle ^7 e o projeto está no 8 (Laravel 13);
 * instalá-lo custaria rebaixar o Guzzle e somar cinco pacotes. Ver ADR 0011.
 *
 * O fluxo é o Authorization Code padrão, com uma escolha importante: o perfil
 * é lido no endpoint `userinfo` em vez de decodificar o `id_token`. Os dois
 * carregam a mesma informação, mas o `id_token` é um JWT que precisaria ter a
 * assinatura verificada contra as chaves públicas rotativas do Google. A
 * resposta do `userinfo` chega pela nossa própria conexão TLS com o Google, e
 * portanto não precisa de assinatura — é o mesmo caminho que o Socialite segue.
 */
final class GoogleOAuth
{
    private const AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN = 'https://oauth2.googleapis.com/token';

    private const PERFIL = 'https://www.googleapis.com/oauth2/v3/userinfo';

    public const PROVIDER = 'google';

    /** Sem credenciais o botão nem aparece, em vez de quebrar no meio do fluxo. */
    public function isConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect'));
    }

    public function authorizationUrl(string $state): string
    {
        return self::AUTORIZACAO.'?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            // `openid email profile`: o mínimo para identificar a pessoa. Não
            // pedimos nada além disso — escopo que não se usa é escopo que
            // assusta na tela de consentimento e vaza se a chave vazar.
            'scope' => 'openid email profile',
            'state' => $state,
            // `select_account` evita o pior atrito do login social: entrar
            // silenciosamente com a conta errada de quem tem várias.
            'prompt' => 'select_account',
        ]);
    }

    public function profileFromCode(string $code): SocialProfileData
    {
        $token = Http::asForm()
            ->timeout(10)
            ->post(self::TOKEN, [
                'code' => $code,
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'grant_type' => 'authorization_code',
            ]);

        if ($token->failed()) {
            throw new RuntimeException('O Google recusou a troca do código de autorização.');
        }

        $acesso = (string) $token->json('access_token');

        if ($acesso === '') {
            throw new RuntimeException('O Google não devolveu token de acesso.');
        }

        $perfil = Http::withToken($acesso)->timeout(10)->get(self::PERFIL);

        if ($perfil->failed()) {
            throw new RuntimeException('Não foi possível ler o perfil no Google.');
        }

        $sub = (string) $perfil->json('sub');
        $email = (string) $perfil->json('email');

        if ($sub === '' || $email === '') {
            throw new RuntimeException('O perfil do Google veio sem identificador ou sem e-mail.');
        }

        return new SocialProfileData(
            provider: self::PROVIDER,
            providerId: $sub,
            email: $email,
            // Conta do Google sem nome existe; cair no e-mail evita usuário
            // chamado "" na plataforma.
            name: (string) ($perfil->json('name') ?: strtok($email, '@')),
            emailVerified: (bool) $perfil->json('email_verified'),
        );
    }
}
