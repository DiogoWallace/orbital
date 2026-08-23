<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Editorial\Models\Post;
use Illuminate\Http\Request;

/**
 * Post completo: o que a página de leitura precisa.
 *
 * @mixin Post
 */
class PostResource extends PostSummaryResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            // Markdown, não HTML: o frontend renderiza pelo mesmo pipeline das
            // seções de módulo, e nenhum HTML arbitrário atravessa a API.
            'body' => $this->body,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ]);
    }
}
