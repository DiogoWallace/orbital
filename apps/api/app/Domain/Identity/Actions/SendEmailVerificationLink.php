<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Models\User;
use App\Domain\Identity\Notifications\VerifyEmailNotification;
use App\Domain\Identity\Support\EmailVerificationTokens;

final class SendEmailVerificationLink
{
    public function __construct(private readonly EmailVerificationTokens $tokens) {}

    /**
     * Não faz nada para quem já confirmou.
     *
     * Reenviar para conta verificada só produziria um link inútil e a dúvida
     * de "por que recebi isso?".
     */
    public function execute(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $user->notify(new VerifyEmailNotification($this->tokens->issue($user)));
    }
}
