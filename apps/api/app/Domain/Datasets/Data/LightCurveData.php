<?php

declare(strict_types=1);

namespace App\Domain\Datasets\Data;

use App\Domain\Datasets\Enums\Mission;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

/**
 * Uma curva de luz pronta para ser ingerida.
 *
 * Espelha o JSON que `tools/tess/baixar-curva.py` produz. O DTO existe para
 * que o formato do arquivo e o formato do banco possam divergir sem que um
 * arraste o outro: se o script mudar de esquema, muda o `fromArchiveJson` e
 * mais nada.
 *
 * ⚠️ **Não construa isto com `LightCurveData::from()`.** O `from()` do
 * spatie/laravel-data não popula propriedades `array` simples: `time` e `flux`
 * voltam vazios, sem erro nenhum. Descoberto ao escrever os testes — dois deles
 * passavam pelo motivo errado, porque esperavam exceção e a recebiam por causa
 * da curva vazia, e não pelo que diziam estar verificando.
 *
 * As duas portas de entrada são o construtor e o `fromArchiveJson()`. O
 * `guardShape` da action é a rede embaixo: uma curva que chegue vazia falha
 * alto na ingestão em vez de virar um dataset de zero pontos.
 */
final class LightCurveData extends Data
{
    /**
     * @param  array<int, float>  $time
     * @param  array<int, float>  $flux
     */
    public function __construct(
        public Mission $mission,
        public string $instrument,
        public string $target,
        public array $time,
        public array $flux,
        public CarbonImmutable $retrievedAt,
        public string $sourceArchive,
        public ?string $pipeline = null,
        public ?string $product = null,
        public ?string $externalId = null,
        public ?int $sector = null,
        public ?int $cadenceSeconds = null,
        public ?string $sourceFile = null,
        public ?string $sha256 = null,
        public ?string $citation = null,
    ) {}

    /**
     * Lê o documento gravado pelo conversor.
     *
     * O campo de citação sai do script com o texto `PREENCHER` justamente para
     * não passar despercebido. Tratá-lo como ausente aqui é deliberado: melhor
     * um dataset que se declara não-citável do que um que exibe a palavra
     * PREENCHER como se fosse a fonte.
     *
     * @param  array<string, mixed>  $documento
     */
    public static function fromArchiveJson(array $documento): self
    {
        $procedencia = $documento['procedencia'] ?? [];
        $citacao = $procedencia['citacao'] ?? null;

        if (is_string($citacao) && str_starts_with($citacao, 'PREENCHER')) {
            $citacao = null;
        }

        return new self(
            mission: Mission::from(mb_strtolower((string) ($procedencia['missao'] ?? 'tess'))),
            instrument: (string) ($procedencia['instrumento'] ?? 'desconhecido'),
            target: (string) ($procedencia['alvo'] ?? 'desconhecido'),
            time: array_map(floatval(...), $documento['tempo'] ?? []),
            flux: array_map(floatval(...), $documento['fluxo'] ?? []),
            retrievedAt: CarbonImmutable::parse($procedencia['obtidoEm'] ?? now()),
            sourceArchive: (string) ($procedencia['arquivo'] ?? 'desconhecido'),
            pipeline: $procedencia['pipeline'] ?? null,
            product: $procedencia['produto'] ?? null,
            externalId: isset($procedencia['tic']) ? (string) $procedencia['tic'] : null,
            sector: isset($procedencia['setor']) ? (int) $procedencia['setor'] : null,
            cadenceSeconds: isset($procedencia['cadenciaSegundos'])
                ? (int) $procedencia['cadenciaSegundos']
                : null,
            sourceFile: $procedencia['arquivoOrigem'] ?? null,
            sha256: $procedencia['sha256'] ?? null,
            citation: $citacao,
        );
    }
}
