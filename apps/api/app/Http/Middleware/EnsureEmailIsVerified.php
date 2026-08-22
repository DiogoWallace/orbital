<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\Http\EmailNotVerifiedException;
use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Substitui o `verified` do framework.
 *
 * O do Laravel aborta com 403 e uma mensagem em inglês, indistinguível de
 * qualquer outra negativa de permissão. Aqui o erro sai com `type` próprio
 * (ver ProblemDetails), que é o que permite à interface reagir com o aviso
 * certo em vez de um "acesso negado" genérico.
 *
 * É uma rede de segurança: a interface já esconde as ações que exigem conta
 * confirmada. Ela existe porque a API é pública e ninguém é obrigado a passar
 * pela interface.
 */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            throw new EmailNotVerifiedException(
                'Confirme seu e-mail para salvar seu trabalho na plataforma.'
            );
        }

        return $next($request);
    }
}
