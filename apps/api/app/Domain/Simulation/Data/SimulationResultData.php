<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Data;

use Spatie\LaravelData\Data;

/**
 * Saída de uma execução de simulação server-side.
 *
 * `series` guarda as trajetórias amostradas (chave → lista de pontos) e
 * `summary` os valores agregados que a interface exibe sem redesenhar nada.
 * A separação evita que o frontend precise varrer milhares de pontos só para
 * mostrar "apogeu: 412 km".
 */
final class SimulationResultData extends Data
{
    public function __construct(
        /** @var array<string, array<int, float>> */
        public array $series,
        /** @var array<string, float|int|string> */
        public array $summary,
        public string $modelVersion,
        /** Tempo de parede da execução, em milissegundos. */
        public ?float $elapsedMs = null,
    ) {}
}
