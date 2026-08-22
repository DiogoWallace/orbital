<?php

declare(strict_types=1);

namespace App\Domain\Identity\Data;

use Spatie\LaravelData\Data;

final class RegisterUserData extends Data
{
    public function __construct(
        public string $name,
        public string $email,
        /** Texto puro: o cast `hashed` do model faz o hash na escrita. */
        public string $password,
    ) {}
}
