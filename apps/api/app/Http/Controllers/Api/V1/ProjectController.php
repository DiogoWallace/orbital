<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Projects\Models\Project;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProjectResource;
use App\Http\Resources\V1\ProjectSummaryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $projects = Project::query()
            ->published()
            ->withCount('modules')
            ->orderByDesc('published_at')
            ->paginate((int) $request->integer('perPage', 12))
            ->withQueryString();

        return ProjectSummaryResource::collection($projects);
    }

    public function show(Request $request, Project $project): ProjectResource
    {
        // Projeto não publicado responde 404, não 403: a existência de um
        // projeto em rascunho é ela própria informação.
        $visible = $project->published_at !== null
            && $project->published_at->isPast()
            && $project->status->value === 'published';

        if (! $visible && ! $request->user()?->isCurator()) {
            throw new NotFoundHttpException;
        }

        $project->load(['owner', 'modules.discipline', 'modules.tags']);

        return new ProjectResource($project);
    }
}
