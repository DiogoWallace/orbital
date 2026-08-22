<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Support\GoogleOAuth;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

class GoogleRedirectController extends Controller
{
    /** Nome do cookie que guarda o `state` entre o redirect e o callback. */
    public const STATE_COOKIE = 'orbital_oauth_state';

    /**
     * Manda o navegador para o Google.
     *
     * O `state` vai na URL e, ao mesmo tempo, num cookie httpOnly de vida
     * curta. No callback os dois precisam bater. É a versão sem sessão da
     * proteção clássica: o atacante consegue montar uma URL de callback com um
     * `code` dele, mas não consegue escrever o cookie no navegador da vítima —
     * e sem os dois lados o login não acontece.
     */
    public function __invoke(GoogleOAuth $google): RedirectResponse
    {
        if (! $google->isConfigured()) {
            throw new ServiceUnavailableHttpException(
                message: 'O login com o Google não está configurado neste ambiente.'
            );
        }

        $state = Str::random(40);

        return redirect()->away($google->authorizationUrl($state))
            ->withCookie(cookie(
                name: self::STATE_COOKIE,
                value: $state,
                minutes: 10,
                path: '/',
                domain: null,
                secure: ! app()->isLocal(),
                httpOnly: true,
                raw: false,
                // `lax` e não `strict`: o callback chega por navegação vinda do
                // Google, que é outro site — com `strict` o cookie não seria
                // enviado e todo login falharia.
                sameSite: 'lax',
            ));
    }
}
