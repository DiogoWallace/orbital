<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Contracts;

use App\Domain\Simulation\Data\SimulationRequestData;
use App\Domain\Simulation\Data\SimulationResultData;

/**
 * Ponto de extensão para simulação executada no servidor.
 *
 * Propositalmente sem implementações no MVP: por padrão a simulação roda no
 * cliente (ADR 0007). Este contrato existe para os casos em que isso não é
 * possível — custo computacional inviável no browser, dataset restrito, ou
 * execução que precisa ser auditável.
 *
 * Implementações vivem em `app/Modules/<Nome>/` e se registram no
 * {@see \App\Domain\Simulation\SimulationEngineRegistry} pela `component_key`
 * do módulo, de modo que o núcleo nunca precise conhecê-las.
 */
interface SimulationEngine
{
    /** `component_key` do módulo que este motor atende. */
    public function moduleKey(): string;

    /**
     * Versão do modelo físico.
     *
     * Gravada junto de cada execução para que resultados antigos permaneçam
     * interpretáveis depois que a física for corrigida.
     */
    public function modelVersion(): string;

    public function run(SimulationRequestData $request): SimulationResultData;
}
