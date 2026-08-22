<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Catalog\Models\ModuleSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ModuleSection
 */
class ModuleSectionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'anchor' => $this->anchor,
            'title' => $this->title,
            'body' => $this->body,
            'meta' => $this->meta ?? [],
            'position' => $this->position,
        ];
    }
}
