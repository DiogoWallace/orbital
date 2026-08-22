<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Simulation\Models\SimulationRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SimulationRun
 */
class SimulationRunResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'parameters' => $this->parameters,
            'result' => $this->result,
            'modelVersion' => $this->model_version,
            'isPublic' => $this->is_public,
            'createdAt' => $this->created_at?->toIso8601String(),
            'module' => new ModuleSummaryResource($this->whenLoaded('module')),
            'author' => new AuthorResource($this->whenLoaded('user')),
        ];
    }
}
