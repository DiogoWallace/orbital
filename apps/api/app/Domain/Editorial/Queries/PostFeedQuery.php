<?php

declare(strict_types=1);

namespace App\Domain\Editorial\Queries;

use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Consulta do feed do blog.
 *
 * Mesmo desenho do catálogo (`ModuleCatalogQuery`): a regra de visibilidade
 * mora em um lugar só, e filtros e ordenações são whitelist — nada que o
 * cliente escreva chega ao SQL.
 */
final class PostFeedQuery
{
    public function __construct(private readonly ?User $viewer = null) {}

    public function paginate(int $perPage = 10): LengthAwarePaginator
    {
        return $this->builder()->paginate($perPage)->withQueryString();
    }

    private function builder(): QueryBuilder
    {
        return QueryBuilder::for(Post::class)
            ->with(['author', 'tags'])
            // Subconsultas de agregação, e não colunas denormalizadas: o
            // contador em coluna é o tipo de dado que sai de sincronia quando
            // um caminho de escrita esquece de incrementar.
            ->withCount([
                'likes',
                // Comentário oculto por moderação não infla o número exibido.
                'comments' => fn ($query) => $query->visible(),
            ])
            ->when($this->viewer, fn ($query) => $query->withExists([
                'likes' => fn ($sub) => $sub->where('user_id', $this->viewer->id),
            ]))
            ->when(
                ! $this->viewer?->isCurator(),
                fn ($query) => $query->published(),
            )
            ->allowedFilters(...[
                AllowedFilter::callback('tag', fn ($query, $value) => $query->whereHas(
                    'tags',
                    fn ($q) => $q->whereIn('slug', (array) $value),
                )),
                AllowedFilter::callback('search', fn ($query, $value) => $query->where(
                    fn ($q) => $q->where('title', 'ilike', "%{$value}%")
                        ->orWhere('excerpt', 'ilike', "%{$value}%"),
                )),
            ])
            ->allowedSorts(...[
                AllowedSort::field('title'),
                AllowedSort::field('publishedAt', 'published_at'),
            ])
            // Blog é cronológico: o mais recente primeiro, sempre.
            ->defaultSort('-published_at');
    }
}
