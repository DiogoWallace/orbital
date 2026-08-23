<?php

declare(strict_types=1);

namespace App\Domain\Community\Actions;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;

final class ToggleLike
{
    /**
     * Curte, ou descurte se já estava curtido.
     *
     * @return bool O estado depois da ação — `true` se ficou curtido.
     */
    public function execute(User $user, Model $likeable): bool
    {
        $existente = $likeable->likes()->where('user_id', $user->id)->first();

        if ($existente !== null) {
            $existente->delete();

            return false;
        }

        try {
            $likeable->likes()->create(['user_id' => $user->id]);
        } catch (UniqueConstraintViolationException) {
            // Dois cliques que chegam juntos: o índice único do banco é quem
            // decide, e o segundo perde. O resultado que o usuário queria —
            // "curtido" — já é o estado real, então não é erro.
        }

        return true;
    }
}
