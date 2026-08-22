<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Models\User;

/**
 * Emite o token que o BFF do Next guardará em cookie httpOnly (ADR 0004).
 *
 * A expiração vem do mesmo `SANCTUM_TOKEN_EXPIRATION` que o frontend usa para
 * o cookie: se os dois horizontes divergirem, o usuário vê "sessão expirada"
 * sem ter expirado, ou o contrário.
 */
final class IssueApiToken
{
    public function execute(User $user, string $deviceName = 'web'): string
    {
        $minutes = (int) config('sanctum.expiration', 10080);

        return $user->createToken(
            name: $deviceName,
            expiresAt: now()->addMinutes($minutes),
        )->plainTextToken;
    }
}
