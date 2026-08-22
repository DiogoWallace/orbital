<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Exceptions;

use RuntimeException;

final class SimulationEngineNotFound extends RuntimeException
{
    public static function forModule(string $moduleKey): self
    {
        return new self(
            "Nenhum motor de simulação server-side registrado para o módulo [{$moduleKey}]. "
            .'Módulos simulam no cliente por padrão (ADR 0007).'
        );
    }
}
