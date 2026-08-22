<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\FindOrCreateSocialUser;
use App\Domain\Identity\Actions\IssueApiToken;
use App\Domain\Identity\Support\AuthExchangeTickets;
use App\Domain\Identity\Support\GoogleOAuth;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class GoogleCallbackController extends Controller
{
    /**
     * Recebe o Google de volta e devolve o navegador ao Next.
     *
     * Toda saída daqui é um redirect para o frontend — inclusive as falhas.
     * Quem está nesta URL é uma pessoa no meio de um login, e um JSON de erro
     * na tela seria um beco sem saída.
     */
    public function __invoke(
        Request $request,
        GoogleOAuth $google,
        FindOrCreateSocialUser $findOrCreate,
        IssueApiToken $issueToken,
        AuthExchangeTickets $tickets,
    ): RedirectResponse {
        $frontend = (string) config('app.frontend_url');
        $esperado = $request->cookie(GoogleRedirectController::STATE_COOKIE);

        // O usuário clicou em "cancelar" na tela do Google.
        if ($request->filled('error')) {
            return $this->voltarComErro($frontend, 'cancelado');
        }

        if (! $request->filled('code') || ! $request->filled('state')) {
            return $this->voltarComErro($frontend, 'incompleto');
        }

        if (! is_string($esperado) || ! hash_equals($esperado, (string) $request->query('state'))) {
            return $this->voltarComErro($frontend, 'estado');
        }

        try {
            $perfil = $google->profileFromCode((string) $request->query('code'));
            $user = $findOrCreate->execute($perfil);
        } catch (Throwable $e) {
            // A causa vai para o log; para o usuário, um aviso legível. A
            // mensagem crua pode conter detalhe da integração.
            logger()->warning('Falha no login com o Google', ['erro' => $e->getMessage()]);

            return $this->voltarComErro($frontend, 'falhou');
        }

        $ticket = $tickets->issue($issueToken->execute($user, 'web'));

        return redirect()
            ->away($frontend.'/api/auth/google/callback?ticket='.$ticket)
            // O cookie de `state` cumpriu o papel; deixá-lo vivo só aumenta a
            // janela em que ele pode ser reusado.
            ->withoutCookie(GoogleRedirectController::STATE_COOKIE);
    }

    private function voltarComErro(string $frontend, string $motivo): RedirectResponse
    {
        return redirect()->away($frontend.'/login?erro='.$motivo)
            ->withoutCookie(GoogleRedirectController::STATE_COOKIE);
    }
}
