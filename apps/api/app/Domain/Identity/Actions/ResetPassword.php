<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Data\ResetPasswordData;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Troca a senha a partir do token recebido por e-mail.
 *
 * Duas consequências deliberadas, além de gravar a senha nova:
 *
 * 1. **Todos os tokens da API são revogados.** Quem redefine a senha ou a
 *    esqueceu, ou desconfia que alguém entrou. Nos dois casos, manter sessões
 *    antigas abertas anula o motivo da troca.
 * 2. **O e-mail passa a valer como verificado.** Clicar no link prova controle
 *    da caixa — que é exatamente o que a verificação de e-mail mede.
 */
final class ResetPassword
{
    /** @return string O status do broker (`Password::PASSWORD_RESET` em caso de sucesso). */
    public function execute(ResetPasswordData $data): string
    {
        return Password::reset(
            [
                'email' => $data->email,
                'password' => $data->password,
                'password_confirmation' => $data->passwordConfirmation,
                'token' => $data->token,
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ]);

                if ($user->email_verified_at === null) {
                    $user->forceFill(['email_verified_at' => now()]);
                }

                $user->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );
    }
}
