<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Catalog\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Recorte de catálogo: o que um card precisa e nada além.
 *
 * Existir separado do {@see ModuleResource} é deliberado — uma listagem de 50
 * módulos não deve carregar 50 `spec` inteiros nem o conteúdo textual completo.
 *
 * @mixin Module
 */
class ModuleSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'summary' => $this->summary,
            'kind' => $this->kind->value,
            'kindLabel' => $this->kind->label(),
            'status' => $this->status->value,
            'difficulty' => $this->difficulty->value,
            'difficultyLabel' => $this->difficulty->label(),
            'componentKey' => $this->component_key,
            'estimatedMinutes' => $this->estimated_minutes,
            'coverPath' => $this->cover_path,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'discipline' => new DisciplineBadgeResource($this->whenLoaded('discipline')),
            'topic' => new TopicResource($this->whenLoaded('topic')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
        ];
    }
}
