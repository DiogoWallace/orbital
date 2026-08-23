<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Identifica quem está autenticado, sem exigir autenticação.
 *
 * As rotas públicas — catálogo, blog, execução compartilhada — não passam por
 * `auth:sanctum`, porque anônimo precisa entrar. Só que sem nenhum middleware
 * de autenticação o guard padrão continua sendo o `web`, baseado em sessão,
 * que numa API stateless nunca tem ninguém. O token no cabeçalho é
 * simplesmente ignorado.
 *
 * O efeito era um bug silencioso: as policies e as consultas de catálogo
 * checam `isCurator()` para liberar rascunho, e recebiam `null` mesmo com um
 * token de administrador válido no cabeçalho. Um curador logado pelo BFF não
 * enxergava o próprio rascunho — e o teste não pegava, porque `actingAs()`
 * popula o guard padrão direto, sem passar pelo caminho do token.
 *
 * `shouldUse` é o mesmo mecanismo que o `Authenticate` do framework usa ao
 * autenticar com sucesso. Ele é necessário porque `Gate` — e portanto toda
 * policy — resolve o usuário pelo guard padrão, não pelo request: mexer só no
 * `setUserResolver` conserta a listagem e deixa a policy vendo `null`.
 *
 * Sem token, o guard do Sanctum devolve `null` e nada muda: esta rota nunca
 * rejeita ninguém, só passa a enxergar quem se identificou.
 */
class ResolveOptionalUser
{
    public function __construct(private readonly AuthFactory $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->auth->shouldUse('sanctum');

        return $next($request);
    }
}
