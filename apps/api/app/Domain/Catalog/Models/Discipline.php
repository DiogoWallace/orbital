<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Raiz da taxonomia: Física, Astronomia, Química, Engenharia...
 *
 * A disciplina carrega identidade visual (cor, ícone) porque a plataforma usa
 * cor como orientação — o usuário reconhece a área antes de ler o título.
 */
class Discipline extends Model
{
    /** @use HasFactory<\Database\Factories\DisciplineFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'tagline',
        'description',
        'accent',
        'icon',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<Topic, $this> */
    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class)->orderBy('position');
    }

    /** Apenas os tópicos de primeiro nível — a árvore desce por `children`. */
    public function rootTopics(): HasMany
    {
        return $this->topics()->whereNull('parent_id');
    }

    /** @return HasMany<Module, $this> */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }
}
