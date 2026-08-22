<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Queries;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Consulta do catálogo de módulos.
 *
 * Objeto de consulta em vez de lógica no controller: a mesma regra de
 * visibilidade vale para a listagem, para o dashboard e para a busca — e
 * duplicá-la é como um rascunho acaba vazando para o público.
 *
 * Filtros e ordenações são whitelist: nada que o cliente escreva chega ao SQL.
 */
final class ModuleCatalogQuery
{
    public function __construct(private readonly ?User $viewer = null) {}

    public function paginate(int $perPage = 12): LengthAwarePaginator
    {
        return $this->builder()->paginate($perPage)->withQueryString();
    }

    private function builder(): QueryBuilder
    {
        return QueryBuilder::for(Module::class)
            ->with(['discipline', 'topic', 'tags'])
            ->when(
                ! $this->viewer?->isCurator(),
                fn ($query) => $query->published(),
            )
            // Variádico: a v7 do query-builder não aceita mais um array aqui.
            ->allowedFilters(...[
                AllowedFilter::exact('kind'),
                AllowedFilter::exact('difficulty'),
                AllowedFilter::callback('discipline', fn ($query, $value) => $query->whereHas(
                    'discipline',
                    fn ($q) => $q->whereIn('slug', (array) $value),
                )),
                AllowedFilter::callback('topic', fn ($query, $value) => $query->whereHas(
                    'topic',
                    fn ($q) => $q->whereIn('slug', (array) $value),
                )),
                AllowedFilter::callback('tag', fn ($query, $value) => $query->whereHas(
                    'tags',
                    fn ($q) => $q->whereIn('slug', (array) $value),
                )),
                // Busca por similaridade: o índice trigram da migration de
                // `modules` é o que mantém isto barato.
                AllowedFilter::callback('search', fn ($query, $value) => $query->where(
                    fn ($q) => $q->where('title', 'ilike', "%{$value}%")
                        ->orWhere('summary', 'ilike', "%{$value}%"),
                )),
            ])
            ->allowedSorts(...[
                AllowedSort::field('title'),
                AllowedSort::field('publishedAt', 'published_at'),
                AllowedSort::field('difficulty'),
            ])
            ->defaultSort('-published_at');
    }
}
