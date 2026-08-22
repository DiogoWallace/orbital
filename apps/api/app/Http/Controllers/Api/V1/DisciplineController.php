<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Models\Discipline;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\DisciplineResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DisciplineController extends Controller
{
    /**
     * Árvore completa da taxonomia.
     *
     * Sem paginação de propósito: são poucas dezenas de linhas e a navegação
     * inteira depende de ter a árvore de uma vez.
     */
    public function index(): AnonymousResourceCollection
    {
        $disciplines = Discipline::query()
            ->with(['rootTopics.children'])
            ->withCount(['modules' => fn ($query) => $query->published()])
            ->orderBy('position')
            ->get();

        return DisciplineResource::collection($disciplines);
    }

    public function show(Discipline $discipline): DisciplineResource
    {
        $discipline->load(['rootTopics.children'])
            ->loadCount(['modules' => fn ($query) => $query->published()]);

        return new DisciplineResource($discipline);
    }
}
