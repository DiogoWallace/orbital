<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Catalog\Models\Module;
use App\Domain\Simulation\Actions\RecordSimulationRun;
use App\Domain\Simulation\Models\SimulationRun;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreSimulationRunRequest;
use App\Http\Resources\V1\SimulationRunResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SimulationRunController extends Controller
{
    /** Execuções do próprio usuário. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $runs = SimulationRun::query()
            ->where('user_id', $request->user()->id)
            ->with('module.discipline')
            ->latest()
            ->paginate((int) $request->integer('perPage', 20));

        return SimulationRunResource::collection($runs);
    }

    public function store(
        StoreSimulationRunRequest $request,
        RecordSimulationRun $recordRun,
    ): JsonResponse {
        $module = Module::where('slug', $request->string('moduleSlug'))->firstOrFail();

        // Salvar execução de um módulo que o usuário nem poderia abrir seria uma
        // porta lateral para descobrir rascunhos.
        $this->authorize('view', $module);

        $run = $recordRun->execute(
            module: $module,
            user: $request->user(),
            parameters: $request->array('parameters'),
            result: $request->array('result') ?: null,
            modelVersion: (string) $request->string('modelVersion'),
            label: $request->string('label')->value() ?: null,
            isPublic: $request->boolean('isPublic'),
        );

        return SimulationRunResource::make($run->load('module'))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function show(SimulationRun $simulationRun): SimulationRunResource
    {
        $this->authorize('view', $simulationRun);

        return new SimulationRunResource($simulationRun->load('module.discipline', 'user'));
    }
}
