<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Policies;

use App\Domain\Identity\Models\User;
use App\Domain\Simulation\Models\SimulationRun;

class SimulationRunPolicy
{
    /** Execução privada é do autor; pública é de quem tiver o link. */
    public function view(?User $user, SimulationRun $run): bool
    {
        if ($run->is_public) {
            return true;
        }

        return $user !== null && ($user->id === $run->user_id || $user->isCurator());
    }

    public function delete(User $user, SimulationRun $run): bool
    {
        return $user->id === $run->user_id || $user->isCurator();
    }
}
