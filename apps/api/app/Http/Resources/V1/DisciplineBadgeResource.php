<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Catalog\Models\Discipline;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Disciplina reduzida ao que um card precisa para se colorir e se rotular.
 *
 * @mixin Discipline
 */
class DisciplineBadgeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'accent' => $this->accent,
            'icon' => $this->icon,
        ];
    }
}
