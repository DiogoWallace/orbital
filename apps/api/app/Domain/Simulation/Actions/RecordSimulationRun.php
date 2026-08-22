<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Actions;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use App\Domain\Simulation\Models\SimulationRun;

/**
 * Persiste uma execução vinda do cliente.
 *
 * O servidor não recalcula nem confia no `result` para nada além de exibição:
 * o número que importa cientificamente é reproduzível a partir de `parameters`
 * e `model_version`. Guardar o resultado é conveniência de leitura, não fonte
 * de verdade — e é por isso que aceitar o payload do cliente é seguro aqui.
 */
final class RecordSimulationRun
{
    /**
     * @param  array<string, mixed>  $parameters
     * @param  array<string, mixed>|null  $result
     */
    public function execute(
        Module $module,
        User $user,
        array $parameters,
        ?array $result,
        string $modelVersion,
        ?string $label = null,
        bool $isPublic = false,
    ): SimulationRun {
        return SimulationRun::create([
            'module_id' => $module->id,
            'user_id' => $user->id,
            'label' => $label,
            'parameters' => $parameters,
            'result' => $result,
            'model_version' => $modelVersion,
            'is_public' => $isPublic,
        ]);
    }
}
