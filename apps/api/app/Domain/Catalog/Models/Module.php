<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use App\Domain\Catalog\Enums\DifficultyLevel;
use App\Domain\Catalog\Enums\ModuleKind;
use App\Domain\Catalog\Enums\ModuleStatus;
use App\Domain\Identity\Models\User;
use App\Domain\Projects\Models\Project;
use App\Domain\Simulation\Models\SimulationRun;
use Database\Factories\ModuleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Unidade central da plataforma: uma experiência científica publicável.
 *
 * Duas colunas fazem todo o trabalho de extensibilidade:
 *
 *  - `component_key` liga esta linha ao componente React registrado em
 *    `apps/web/src/modules/registry.ts` (ver ADR 0005);
 *  - `spec` (jsonb) descreve variáveis, faixas, unidades e presets sem exigir
 *    uma migration por módulo (ver ADR 0006).
 *
 * O banco não garante a forma do `spec` — quem garante é o schema da aplicação.
 */
class Module extends Model
{
    /** @use HasFactory<ModuleFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'discipline_id',
        'topic_id',
        'author_id',
        'slug',
        'title',
        'subtitle',
        'summary',
        'kind',
        'status',
        'difficulty',
        'component_key',
        'spec',
        'estimated_minutes',
        'cover_path',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'kind' => ModuleKind::class,
            'status' => ModuleStatus::class,
            'difficulty' => DifficultyLevel::class,
            'spec' => 'array',
            'estimated_minutes' => 'integer',
            'published_at' => 'immutable_datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return BelongsTo<Discipline, $this> */
    public function discipline(): BelongsTo
    {
        return $this->belongsTo(Discipline::class);
    }

    /** @return BelongsTo<Topic, $this> */
    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @return HasMany<ModuleSection, $this> */
    public function sections(): HasMany
    {
        return $this->hasMany(ModuleSection::class)->orderBy('position');
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /** @return BelongsToMany<Project, $this> */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class)->withPivot('position');
    }

    /** @return HasMany<SimulationRun, $this> */
    public function runs(): HasMany
    {
        return $this->hasMany(SimulationRun::class);
    }

    /**
     * Recorte público do catálogo.
     *
     * Publicação agendada é intencional: `published_at` no futuro mantém o
     * módulo fora do catálogo até a data, sem processo em background.
     *
     * @param  Builder<Module>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ModuleStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status->isPublic()
            && $this->published_at !== null
            && $this->published_at->isPast();
    }
}
