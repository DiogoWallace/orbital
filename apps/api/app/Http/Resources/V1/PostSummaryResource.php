<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Editorial\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Recorte de listagem: o que um card do blog precisa e nada além.
 *
 * O `body` fica de fora de propósito — uma página de dez posts não deve
 * trafegar dez textos inteiros para exibir dez resumos.
 *
 * @mixin Post
 */
class PostSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'status' => $this->status->value,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'readingMinutes' => $this->readingMinutes(),
            'coverPath' => $this->cover_path,
            'coverCredit' => $this->cover_credit,
            'coverSource' => $this->cover_source,
            'author' => new AuthorResource($this->whenLoaded('author')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
        ];
    }
}
