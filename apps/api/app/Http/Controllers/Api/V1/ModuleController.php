<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Models\Module;
use App\Domain\Catalog\Queries\ModuleCatalogQuery;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ModuleResource;
use App\Http\Resources\V1\ModuleSummaryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ModuleController extends Controller
{
    /**
     * Catálogo de módulos.
     *
     * Filtros: `filter[discipline]`, `filter[topic]`, `filter[tag]`,
     * `filter[kind]`, `filter[difficulty]`, `filter[search]`.
     * Ordenação: `sort=title|publishedAt|difficulty` (prefixo `-` inverte).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $modules = (new ModuleCatalogQuery($request->user()))
            ->paginate((int) $request->integer('perPage', 12));

        return ModuleSummaryResource::collection($modules);
    }

    public function show(Request $request, Module $module): ModuleResource
    {
        // Quem não pode ver recebe 404, não 403: um 403 confirmaria que aquele
        // slug existe, e a existência de um rascunho já é informação.
        // A decisão de quem pode ver continua na policy, não aqui.
        if (Gate::denies('view', $module)) {
            throw new NotFoundHttpException;
        }

        $module->load(['discipline', 'topic', 'tags', 'sections', 'author', 'projects']);

        return new ModuleResource($module);
    }
}
