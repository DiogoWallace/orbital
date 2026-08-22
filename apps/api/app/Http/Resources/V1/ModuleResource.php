<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Catalog\Models\Module;
use Illuminate\Http\Request;

/**
 * Módulo completo: o que a página individual precisa para montar a experiência.
 *
 * @mixin Module
 */
class ModuleResource extends ModuleSummaryResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            // O contrato do componente React: variáveis, faixas, unidades,
            // presets. O núcleo não interpreta este conteúdo (ADR 0006).
            'spec' => $this->spec ?? [],

            'sections' => ModuleSectionResource::collection($this->whenLoaded('sections')),
            'author' => new AuthorResource($this->whenLoaded('author')),
            'projects' => ProjectSummaryResource::collection($this->whenLoaded('projects')),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }
}
