<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Projects\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'kind' => $this->kind->value,
            'kindLabel' => $this->kind->label(),
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'coverPath' => $this->cover_path,
            'startedAt' => $this->started_at?->toDateString(),
            'publishedAt' => $this->published_at?->toIso8601String(),
            'modulesCount' => $this->whenCounted('modules'),
        ];
    }
}
