<?php

declare(strict_types=1);

namespace App\Domain\Simulation;

use App\Domain\Simulation\Contracts\SimulationEngine;
use App\Domain\Simulation\Exceptions\SimulationEngineNotFound;

/**
 * Espelho no backend do registry do frontend (ADR 0005).
 *
 * Um módulo com motor server-side registra a implementação aqui, pela mesma
 * `component_key` usada no frontend. O núcleo consulta o registry; ele nunca
 * conhece as classes concretas — por isso adicionar um motor não altera nenhum
 * arquivo do núcleo.
 */
final class SimulationEngineRegistry
{
    /** @var array<string, SimulationEngine> */
    private array $engines = [];

    public function register(SimulationEngine $engine): void
    {
        $this->engines[$engine->moduleKey()] = $engine;
    }

    public function has(string $moduleKey): bool
    {
        return isset($this->engines[$moduleKey]);
    }

    public function get(string $moduleKey): SimulationEngine
    {
        return $this->engines[$moduleKey]
            ?? throw SimulationEngineNotFound::forModule($moduleKey);
    }

    /** @return array<int, string> */
    public function registeredKeys(): array
    {
        return array_keys($this->engines);
    }
}
