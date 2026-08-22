<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Eixo de navegação transversal à taxonomia.
 *
 * A árvore de disciplinas responde "onde isso mora"; a tag responde "o que isso
 * tem a ver com aquilo" — propulsão aparece em Engenharia e em Física.
 */
class Tag extends Model
{
    /** @use HasFactory<\Database\Factories\TagFactory> */
    use HasFactory;

    protected $fillable = ['slug', 'name'];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return BelongsToMany<Module, $this> */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class);
    }
}
