<?php

declare(strict_types=1);

namespace App\Domain\Datasets\Models;

use App\Domain\Datasets\Enums\Mission;
use Database\Factories\DatasetFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Uma série observacional, com a procedência que a torna citável.
 *
 * O modelo guarda de onde o dado veio e quando; os pontos ficam em
 * `DatasetSeries`, numa tabela à parte, para que listar o catálogo não arraste
 * megabytes junto.
 *
 * A regra que sustenta a existência desta tabela está no ADR 0014: uma análise
 * só é reproduzível se conseguir nomear o dado sobre o qual rodou. Um `Dataset`
 * sem `sha256` e sem `retrieved_at` cumpre metade do trato — dá para exibir,
 * não dá para citar.
 */
class Dataset extends Model
{
    /** @use HasFactory<DatasetFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'summary',
        'mission',
        'instrument',
        'pipeline',
        'product',
        'quality_mask',
        'target',
        'external_id',
        'sector',
        'cadence_seconds',
        'source_archive',
        'source_file',
        'sha256',
        'retrieved_at',
        'citation',
        'points',
        'time_span_days',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'mission' => Mission::class,
            'retrieved_at' => 'immutable_datetime',
            'published_at' => 'immutable_datetime',
            'sector' => 'integer',
            'cadence_seconds' => 'integer',
            'points' => 'integer',
            'time_span_days' => 'float',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasOne<DatasetSeries, $this> */
    public function series(): HasOne
    {
        return $this->hasOne(DatasetSeries::class);
    }

    /**
     * Só o que está publicado aparece para quem não é curadoria.
     *
     * @param  Builder<Dataset>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    /**
     * A série é citável quando dá para provar sobre qual arquivo ela rodou.
     *
     * Exposto como pergunta, e não como validação no momento da escrita, de
     * propósito: um dataset incompleto pode existir enquanto se busca a
     * procedência que falta. O que não pode é passar por completo.
     */
    public function isCitable(): bool
    {
        return $this->sha256 !== null && $this->citation !== null;
    }
}
