<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Datasets\Models\Dataset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um dataset com a procedência inteira — e sem os pontos.
 *
 * A série sai por rota própria. Quem quer desenhar pede os pontos; quem quer
 * saber de onde o dado veio não precisa baixar megabytes para descobrir.
 *
 * `citable` viaja calculado, e não deduzido no cliente. Se cada tela decidir
 * sozinha o que torna um dado citável, duas telas discordam na primeira
 * mudança de regra.
 *
 * @mixin Dataset
 */
class DatasetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,

            'target' => $this->target,
            'externalId' => $this->external_id,
            'sector' => $this->sector,
            'cadenceSeconds' => $this->cadence_seconds,

            'points' => $this->points,
            'timeSpanDays' => $this->time_span_days,

            'provenance' => [
                'mission' => $this->mission->value,
                'missionLabel' => $this->mission->label(),
                'missionFullName' => $this->mission->fullName(),
                'instrument' => $this->instrument,
                'pipeline' => $this->pipeline,
                'product' => $this->product,
                'archive' => $this->source_archive,
                'file' => $this->source_file,
                'sha256' => $this->sha256,
                'retrievedAt' => $this->retrieved_at?->toIso8601String(),
                'citation' => $this->citation,
            ],

            'citable' => $this->isCitable(),
            'publishedAt' => $this->published_at?->toIso8601String(),
        ];
    }
}
