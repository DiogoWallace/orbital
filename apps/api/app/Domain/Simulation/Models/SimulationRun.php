<?php

declare(strict_types=1);

namespace App\Domain\Simulation\Models;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use Database\Factories\SimulationRunFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro reproduzível de uma execução de simulação.
 *
 * A simulação em si roda no cliente (ADR 0007). O que o servidor guarda é o que
 * torna um resultado *citável*: os parâmetros de entrada, o resumo do resultado
 * e a versão do modelo que os produziu.
 *
 * `model_version` existe justamente para que uma execução salva hoje continue
 * interpretável depois que a física do módulo for corrigida — sem ela, um
 * resultado antigo passaria a parecer errado sem explicação.
 *
 * Chave pública é UUID: um id sequencial exposto numa URL compartilhável revela
 * volume de uso e convida enumeração.
 */
class SimulationRun extends Model
{
    /** @use HasFactory<SimulationRunFactory> */
    use HasFactory;

    use HasUuids;

    protected $fillable = [
        'module_id',
        'user_id',
        'label',
        'parameters',
        'result',
        'model_version',
        'is_public',
    ];

    protected function casts(): array
    {
        return [
            'parameters' => 'array',
            'result' => 'array',
            'is_public' => 'boolean',
        ];
    }

    /** @return BelongsTo<Module, $this> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
