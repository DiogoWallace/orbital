<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Datasets\Actions\IngestLightCurve;
use App\Domain\Datasets\Data\LightCurveData;
use Illuminate\Console\Command;
use JsonException;
use Throwable;

/**
 * Ingere o JSON produzido por `tools/tess/baixar-curva.py`.
 *
 * A conversão de FITS acontece fora da aplicação; o que entra aqui já é a
 * curva normalizada com a procedência ao lado. Este comando é a fronteira
 * entre as duas metades.
 */
class ImportLightCurve extends Command
{
    protected $signature = 'datasets:import
        {arquivo* : Um ou mais JSON gerados pelo conversor}
        {--publish : Publica o dataset em vez de deixá-lo como rascunho}
        {--slug= : Força o slug; só faz sentido com um arquivo só}';

    protected $description = 'Importa curvas de luz convertidas, com a procedência';

    public function handle(IngestLightCurve $ingerir): int
    {
        $arquivos = (array) $this->argument('arquivo');
        $slug = $this->option('slug');

        if ($slug !== null && count($arquivos) > 1) {
            $this->error('--slug com vários arquivos criaria um dataset só, sobrescrito a cada passo.');

            return self::FAILURE;
        }

        $falhas = 0;

        foreach ($arquivos as $caminho) {
            try {
                $dataset = $ingerir->execute(
                    LightCurveData::fromArchiveJson($this->readJson($caminho)),
                    slug: $slug,
                    publish: (bool) $this->option('publish'),
                );
            } catch (Throwable $erro) {
                $this->error(basename((string) $caminho).': '.$erro->getMessage());
                $falhas++;

                continue;
            }

            $this->info(sprintf(
                '%s — %d pontos, %.2f dias%s',
                $dataset->slug,
                $dataset->points,
                $dataset->time_span_days ?? 0,
                $dataset->published_at ? '' : ' (rascunho)',
            ));

            // Um dataset não citável não é erro de importação, mas é dívida —
            // e dívida que ninguém vê não é paga.
            if (! $dataset->isCitable()) {
                $this->warn(
                    '  sem '.($dataset->sha256 === null ? 'soma de verificação' : 'citação').
                    ': não é citável até isso ser preenchido (ADR 0014).',
                );
            }
        }

        return $falhas > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** @return array<string, mixed> */
    private function readJson(string $caminho): array
    {
        if (! is_file($caminho)) {
            throw new JsonException("arquivo não encontrado: {$caminho}");
        }

        $conteudo = file_get_contents($caminho);

        if ($conteudo === false) {
            throw new JsonException("não consegui ler {$caminho}");
        }

        $documento = json_decode($conteudo, true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($documento)) {
            throw new JsonException('o JSON não é um objeto');
        }

        return $documento;
    }
}
