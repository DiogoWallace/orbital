<?php

declare(strict_types=1);

namespace App\Domain\Identity\Support;

use App\Domain\Identity\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Emissão e consumo dos tokens de verificação de e-mail.
 *
 * O mesmo desenho do broker de senha do Laravel, reduzido ao que precisamos:
 * token aleatório entregue por e-mail, hash guardado no banco, validade curta,
 * uso único.
 */
final class EmailVerificationTokens
{
    private const TABLE = 'email_verification_tokens';

    /** Uma hora, o mesmo horizonte do link de recuperação de senha. */
    public const EXPIRE_MINUTES = 60;

    /** @return string O token em texto puro — a única vez que ele existe legível. */
    public function issue(User $user): string
    {
        $token = Str::random(64);

        // `updateOrInsert` e não `insert`: pedir de novo invalida o link
        // anterior, para que nunca haja dois links válidos para a mesma conta.
        DB::table(self::TABLE)->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()],
        );

        return $token;
    }

    /**
     * Confere o token e o queima.
     *
     * Devolve `false` para token errado, expirado ou já usado — sem distinguir
     * os casos, porque quem está tentando adivinhar não precisa da dica.
     */
    public function consume(string $email, string $token): bool
    {
        $registro = DB::table(self::TABLE)->where('email', $email)->first();

        if ($registro === null || ! Hash::check($token, $registro->token)) {
            return false;
        }

        if ($this->expirou($registro->created_at)) {
            DB::table(self::TABLE)->where('email', $email)->delete();

            return false;
        }

        DB::table(self::TABLE)->where('email', $email)->delete();

        return true;
    }

    private function expirou(?string $criadoEm): bool
    {
        return $criadoEm === null
            || Carbon::parse($criadoEm)->addMinutes(self::EXPIRE_MINUTES)->isPast();
    }
}
