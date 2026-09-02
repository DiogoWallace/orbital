<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Datasets\Models\Dataset;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\DatasetResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DatasetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $datasets = Dataset::query()
            ->when(
                ! $request->user()?->isCurator(),
                fn ($query) => $query->published(),
            )
            ->when(
                $request->filled('mission'),
                fn ($query) => $query->where('mission', $request->string('mission')),
            )
            ->latest('retrieved_at')
            ->paginate((int) $request->integer('perPage', 20));

        return DatasetResource::collection($datasets);
    }

    public function show(Request $request, Dataset $dataset): DatasetResource
    {
        $this->guardVisibility($request, $dataset);

        return new DatasetResource($dataset);
    }

    /**
     * Os pontos, em rota separada.
     *
     * Dois vetores paralelos em vez de uma lista de pares: metade dos bytes, e
     * é a forma que o cliente quer — o `Float64Array` do módulo é construído
     * direto de cada vetor, sem laço de desempacotamento.
     */
    public function series(Request $request, Dataset $dataset): JsonResponse
    {
        $this->guardVisibility($request, $dataset);

        $series = $dataset->series;

        if ($series === null) {
            throw new NotFoundHttpException('Este dataset ainda não tem série.');
        }

        return response()->json([
            'data' => [
                'slug' => $dataset->slug,
                'points' => $dataset->points,
                'time' => $series->time,
                'flux' => $series->flux,
            ],
        ]);
    }

    /**
     * Rascunho responde 404, e não 403.
     *
     * Um 403 confirmaria que o dataset existe, o que entrega a quem não devia
     * a informação de que há dado sendo preparado. É a mesma escolha que o
     * catálogo já faz com módulo não publicado.
     */
    private function guardVisibility(Request $request, Dataset $dataset): void
    {
        if ($dataset->published_at !== null) {
            return;
        }

        if ($request->user()?->isCurator()) {
            return;
        }

        throw new NotFoundHttpException;
    }
}
