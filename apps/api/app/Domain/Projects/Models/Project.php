<?php

declare(strict_types=1);

namespace App\Domain\Projects\Models;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use App\Domain\Projects\Enums\ProjectKind;
use App\Domain\Projects\Enums\ProjectStatus;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Fio narrativo que costura vários módulos.
 *
 * Um módulo é uma peça isolada; um projeto é a pesquisa que a usa. "Como um
 * foguete funciona" pode reunir o módulo de anatomia, o de combustão e o de
 * trajetória — e cada um deles continua existindo por conta própria.
 */
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'slug',
        'title',
        'summary',
        'description',
        'kind',
        'status',
        'cover_path',
        'started_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'kind' => ProjectKind::class,
            'status' => ProjectStatus::class,
            'started_at' => 'immutable_date',
            'published_at' => 'immutable_datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return BelongsToMany<Module, $this> */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class)
            ->withPivot('position')
            ->orderByPivot('position');
    }

    /** @param  Builder<Project>  $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ProjectStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
