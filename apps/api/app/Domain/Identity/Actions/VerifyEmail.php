<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Support\EmailVerificationTokens;
use Illuminate\Auth\Events\Verified;

final class VerifyEmail
{
    public function __construct(private readonly EmailVerificationTokens $tokens) {}

    /**
     * Confirma o endereço a partir do token do e-mail.
     *
     * Devolve `true` também quando a conta já estava verificada: clicar duas
     * vezes no mesmo link é acidente comum, e mostrar erro nesse caso assusta
     * sem motivo — o estado desejado já é o que está no banco.
     */
    public function execute(string $email, string $token): bool
    {
        $user = User::where('email', $email)->first();

        if ($user === null) {
            return false;
        }

        if ($user->hasVerifiedEmail()) {
            return true;
        }

        if (! $this->tokens->consume($email, $token)) {
            return false;
        }

        $user->forceFill(['email_verified_at' => now()])->save();

        event(new Verified($user));

        return true;
    }
}
