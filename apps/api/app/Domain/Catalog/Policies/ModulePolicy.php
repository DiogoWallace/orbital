<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Policies;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;

class ModulePolicy
{
    /**
     * Um módulo não publicado é visível para quem cura o catálogo e para quem
     * o escreveu — e para mais ninguém, mesmo com o slug em mãos.
     */
    public function view(?User $user, Module $module): bool
    {
        if ($module->isPubliclyVisible()) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        return $user->isCurator() || $user->id === $module->author_id;
    }

    public function create(User $user): bool
    {
        return $user->isCurator() || $user->hasRole('contributor');
    }

    public function update(User $user, Module $module): bool
    {
        return $user->isCurator() || $user->id === $module->author_id;
    }

    /** Publicar é ato de curadoria, mesmo sobre o próprio módulo. */
    public function publish(User $user, Module $module): bool
    {
        return $user->isCurator();
    }

    public function delete(User $user, Module $module): bool
    {
        return $user->isCurator();
    }
}
