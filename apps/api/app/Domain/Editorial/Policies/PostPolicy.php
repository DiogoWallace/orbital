<?php

declare(strict_types=1);

namespace App\Domain\Editorial\Policies;

use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;

class PostPolicy
{
    /**
     * Rascunho é visível para quem cura e para quem escreveu — e para mais
     * ninguém, mesmo com o slug em mãos.
     */
    public function view(?User $user, Post $post): bool
    {
        if ($post->isPubliclyVisible()) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        return $user->isCurator() || $user->id === $post->author_id;
    }

    public function create(User $user): bool
    {
        return $user->isCurator();
    }

    public function update(User $user, Post $post): bool
    {
        return $user->isCurator() || $user->id === $post->author_id;
    }

    /** Publicar é ato de curadoria, mesmo sobre o próprio texto. */
    public function publish(User $user, Post $post): bool
    {
        return $user->isCurator();
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->isCurator();
    }
}
