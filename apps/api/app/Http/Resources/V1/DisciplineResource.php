<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Catalog\Models\Discipline;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Discipline
 */
class DisciplineResource extends JsonResource
{
    /**
     * As chaves saem em camelCase de propósito: o consumidor é TypeScript, e
     * converter no cliente espalharia mapeamento por todo o frontend.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'accent' => $this->accent,
            'icon' => $this->icon,
            'position' => $this->position,
            'topics' => TopicResource::collection($this->whenLoaded('rootTopics')),
            'modulesCount' => $this->whenCounted('modules'),
        ];
    }
}
