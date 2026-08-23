<?php

declare(strict_types=1);

namespace App\Domain\Community\Policies;

use App\Domain\Community\Enums\CommentStatus;
use App\Domain\Community\Models\Comment;
use App\Domain\Identity\Models\User;

class CommentPolicy
{
    /** Comentário oculto continua visível para a curadoria e para quem escreveu. */
    public function view(?User $user, Comment $comment): bool
    {
        if ($comment->status === CommentStatus::Visible) {
            return true;
        }

        return $user !== null
            && ($user->isCurator() || $user->id === $comment->user_id);
    }

    /**
     * Editar é do autor, e só dele.
     *
     * A curadoria oculta, não reescreve: mudar a palavra de alguém sob o nome
     * dessa pessoa é pior do que tirar o comentário do ar.
     */
    public function update(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id;
    }

    /** Apagar o próprio comentário é direito de quem escreveu; a curadoria também pode. */
    public function delete(User $user, Comment $comment): bool
    {
        return $user->id === $comment->user_id || $user->isCurator();
    }

    public function moderate(User $user): bool
    {
        return $user->isCurator();
    }

    /** Denunciar o próprio comentário não faz sentido — use apagar. */
    public function report(User $user, Comment $comment): bool
    {
        return $user->id !== $comment->user_id;
    }
}
