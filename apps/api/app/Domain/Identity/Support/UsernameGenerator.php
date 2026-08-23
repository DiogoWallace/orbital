<?php

declare(strict_types=1);

namespace App\Domain\Identity\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sugere um `username` livre a partir do que já se sabe da pessoa.
 *
 * Existe porque ninguém deve ser obrigado a escolher um apelido no meio do
 * cadastro — muito menos quem entra pelo Google, que espera um clique e pronto.
 * A conta nasce com um sugerido, e a pessoa troca depois se quiser.
 *
 * O desempate é numérico e determinístico: `ada`, `ada2`, `ada3`. Sufixo
 * aleatório daria nomes feios e imprevisíveis para o próprio dono.
 */
final class UsernameGenerator
{
    private const MINIMO = 3;

    private const MAXIMO = 32;

    /** Base a partir do nome; se o nome não render nada usável, cai no e-mail. */
    public function paraNomeOuEmail(?string $nome, ?string $email): string
    {
        $base = $this->normalizar((string) $nome);

        if (mb_strlen($base) < self::MINIMO) {
            $base = $this->normalizar(strtok((string) $email, '@') ?: '');
        }

        // Última rede: conta sem nome e sem e-mail utilizável ainda precisa de
        // um endereço público válido.
        if (mb_strlen($base) < self::MINIMO) {
            $base = 'orbital';
        }

        return $this->primeiroLivre($base);
    }

    /**
     * Reduz um texto qualquer à forma aceita num username.
     *
     * `Str::slug` com separador vazio: acento vira letra sem acento, e tudo que
     * não for letra ou número simplesmente some. "José da Silva" vira
     * "josedasilva", não "jos-da-silva".
     */
    private function normalizar(string $texto): string
    {
        $limpo = Str::slug($texto, '');

        return mb_substr($limpo, 0, self::MAXIMO - 3);
    }

    private function primeiroLivre(string $base): string
    {
        if (! $this->existe($base)) {
            return $base;
        }

        // O limite existe para o laço não virar varredura infinita num nome
        // muito disputado; a partir dele, o sufixo aleatório é aceitável
        // justamente porque é caso raro.
        for ($n = 2; $n <= 999; $n++) {
            $tentativa = $base.$n;

            if (! $this->existe($tentativa)) {
                return $tentativa;
            }
        }

        return $base.Str::lower(Str::random(4));
    }

    private function existe(string $username): bool
    {
        return DB::table('users')->where('username', $username)->exists();
    }
}
