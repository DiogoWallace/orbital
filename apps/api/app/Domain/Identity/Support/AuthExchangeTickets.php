<?php

declare(strict_types=1);

namespace App\Domain\Identity\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * A ponte entre o callback do provedor e o BFF do Next.
 *
 * O callback do Google chega na API, mas quem guarda a sessão é o Next, em
 * cookie httpOnly (ADR 0004). Redirecionar com o token de acesso na query
 * string o colocaria no histórico do navegador, no Referer e no log de
 * qualquer proxy no caminho.
 *
 * Em vez disso a API redireciona com um *ticket*: uma string aleatória, válida
 * por um minuto, que só pode ser trocada uma vez, e só por quem consegue falar
 * com a API pela rede interna — o BFF. O token real nunca passa pelo navegador.
 */
final class AuthExchangeTickets
{
    /** Um minuto: o tempo de um redirect, não o de uma sessão. */
    private const TTL_SEGUNDOS = 60;

    private const PREFIXO = 'auth-ticket:';

    public function issue(string $token): string
    {
        $ticket = Str::random(64);

        Cache::put(self::PREFIXO.$ticket, $token, self::TTL_SEGUNDOS);

        return $ticket;
    }

    /** @return string|null O token, ou `null` se o ticket não existe, expirou ou já foi usado. */
    public function consume(string $ticket): ?string
    {
        $chave = self::PREFIXO.$ticket;

        $token = Cache::get($chave);

        // `pull` faria o mesmo, mas em duas etapas explícitas fica claro que o
        // uso único é intencional, e não efeito colateral de um helper.
        Cache::forget($chave);

        return is_string($token) ? $token : null;
    }
}
