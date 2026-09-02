<?php

declare(strict_types=1);

namespace App\Domain\Datasets\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Os pontos de uma série, em tabela própria.
 *
 * Dois vetores paralelos — tempo e fluxo — em vez de uma lista de pares. É
 * metade dos bytes em JSON, e é a forma que o cliente quer: o `Float64Array`
 * do módulo é construído direto do vetor, sem um laço de desempacotamento a
 * cada leitura.
 *
 * A separação da tabela `datasets` é o ponto todo desta classe. Listar o
 * catálogo não pode carregar as séries junto, e é fácil isso acontecer sem
 * querer se as colunas morarem na mesma linha.
 */
class DatasetSeries extends Model
{
    protected $table = 'dataset_series';

    protected $fillable = [
        'dataset_id',
        'time',
        'flux',
    ];

    protected function casts(): array
    {
        return [
            'time' => 'array',
            'flux' => 'array',
        ];
    }

    /** @return BelongsTo<Dataset, $this> */
    public function dataset(): BelongsTo
    {
        return $this->belongsTo(Dataset::class);
    }
}
