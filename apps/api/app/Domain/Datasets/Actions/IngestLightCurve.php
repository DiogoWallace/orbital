<?php

declare(strict_types=1);

namespace App\Domain\Datasets\Actions;

use App\Domain\Datasets\Data\LightCurveData;
use App\Domain\Datasets\Models\Dataset;
use App\Domain\Datasets\Models\DatasetSeries;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Grava uma curva de luz com a sua procedência.
 *
 * A ingestão é idempotente pelo `slug`: rodar de novo sobre o mesmo arquivo
 * atualiza a linha em vez de criar uma segunda. É o comportamento que se quer
 * quando a procedência de um dataset é completada depois — a citação chega dias
 * após a curva, e isso não deve produzir um par de datasets rivais.
 *
 * O que ela **não** faz é decidir se o dado presta. Curva curta demais, ruidosa
 * demais ou de alvo errado entra igual: julgar qualidade científica é trabalho
 * de quem analisa, e um filtro escondido na ingestão seria uma opinião que
 * ninguém veria.
 */
final class IngestLightCurve
{
    public function execute(LightCurveData $curva, ?string $slug = null, bool $publish = false): Dataset
    {
        $this->guardShape($curva);

        $slug ??= $this->slugFor($curva);

        return DB::transaction(function () use ($curva, $slug, $publish): Dataset {
            $dataset = Dataset::updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $this->titleFor($curva),
                    'mission' => $curva->mission,
                    'instrument' => $curva->instrument,
                    'pipeline' => $curva->pipeline,
                    'product' => $curva->product,
                    'target' => $curva->target,
                    'external_id' => $curva->externalId,
                    'sector' => $curva->sector,
                    'cadence_seconds' => $curva->cadenceSeconds,
                    'source_archive' => $curva->sourceArchive,
                    'source_file' => $curva->sourceFile,
                    'sha256' => $curva->sha256,
                    'retrieved_at' => $curva->retrievedAt,
                    'citation' => $curva->citation,
                    'points' => count($curva->time),
                    'time_span_days' => $this->spanOf($curva),
                    'published_at' => $publish ? now() : null,
                ],
            );

            DatasetSeries::updateOrCreate(
                ['dataset_id' => $dataset->id],
                ['time' => $curva->time, 'flux' => $curva->flux],
            );

            return $dataset->fresh();
        });
    }

    /**
     * Recusa o que não é uma série.
     *
     * Vetores de tamanhos diferentes são o erro clássico de quem converte à
     * mão, e ele passa despercebido: a curva simplesmente fica torta a partir
     * do ponto em que os dois se desencontram. Melhor falhar na porta.
     */
    private function guardShape(LightCurveData $curva): void
    {
        $pontos = count($curva->time);

        if ($pontos === 0) {
            throw new InvalidArgumentException('A curva não tem pontos.');
        }

        if ($pontos !== count($curva->flux)) {
            throw new InvalidArgumentException(
                "Tempo e fluxo têm tamanhos diferentes: {$pontos} e ".count($curva->flux).'.',
            );
        }
    }

    private function spanOf(LightCurveData $curva): float
    {
        return (float) (max($curva->time) - min($curva->time));
    }

    private function slugFor(LightCurveData $curva): string
    {
        $partes = array_filter([
            $curva->mission->value,
            $curva->externalId ? 'tic'.$curva->externalId : null,
            $curva->sector !== null ? 's'.str_pad((string) $curva->sector, 2, '0', STR_PAD_LEFT) : null,
        ]);

        return implode('-', $partes);
    }

    private function titleFor(LightCurveData $curva): string
    {
        $titulo = $curva->target;

        if ($curva->sector !== null) {
            $titulo .= " · setor {$curva->sector}";
        }

        return $titulo;
    }
}
