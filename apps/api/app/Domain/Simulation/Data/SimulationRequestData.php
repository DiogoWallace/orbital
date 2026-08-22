<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Data;

use Spatie\LaravelData\Data;

/**
 * Entrada de uma execução de simulação server-side.
 *
 * `parameters` é um mapa livre porque cada módulo define suas próprias
 * variáveis (ADR 0006); a validação da forma é responsabilidade do motor que
 * atende aquele `moduleKey`, que conhece o `spec` do módulo.
 */
final class SimulationRequestData extends Data
{
    public function __construct(
        public string $moduleKey,
        /** @var array<string, mixed> */
        public array $parameters,
        /** Duração simulada, em segundos. Null = o motor decide. */
        public ?float $duration = null,
        /** Passo de integração, em segundos. Null = o motor decide. */
        public ?float $timestep = null,
    ) {}
}
