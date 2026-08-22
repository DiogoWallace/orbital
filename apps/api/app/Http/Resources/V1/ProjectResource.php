<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Projects\Models\Project;
use Illuminate\Http\Request;

/**
 * @mixin Project
 */
class ProjectResource extends ProjectSummaryResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'owner' => new AuthorResource($this->whenLoaded('owner')),
            'modules' => ModuleSummaryResource::collection($this->whenLoaded('modules')),
        ]);
    }
}
