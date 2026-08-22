<?php

declare(strict_types=1);

namespace App\Domain\Identity\Data;

use Spatie\LaravelData\Data;

final class ResetPasswordData extends Data
{
    public function __construct(
        /** O token opaco que veio no link do e-mail. */
        public string $token,
        public string $email,
        /** Texto puro: o cast `hashed` do model faz o hash na escrita. */
        public string $password,
        public string $passwordConfirmation,
    ) {}
}
