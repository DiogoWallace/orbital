<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Community\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

/**
 * Um comentário do fio.
 *
 * @mixin Comment
 */
class CommentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parentId' => $this->parent_id,
            'body' => $this->body,
            'status' => $this->status->value,
            'createdAt' => $this->created_at?->toIso8601String(),
            'editedAt' => $this->edited_at?->toIso8601String(),
            'author' => new PublicProfileResource($this->whenLoaded('author')),
            'likesCount' => $this->whenCounted('likes'),
            // Se *este* leitor curtiu. Carregado por `withExists` no
            // controller; ausente quando não há ninguém logado.
            'liked' => $this->carregado('likes_exists'),

            // As permissões vêm da policy, e não de uma regra reescrita no
            // frontend: um botão que aparece e depois recebe 403 é pior que
            // botão nenhum, e duas cópias da mesma regra divergem.
            'viewerCan' => [
                'edit' => Gate::allows('update', $this->resource),
                'delete' => Gate::allows('delete', $this->resource),
                'report' => Gate::allows('report', $this->resource),
                'moderate' => Gate::allows('moderate', $this->resource),
            ],

            'replies' => self::collection($this->whenLoaded('replies')),
        ];
    }

    /**
     * Lê um atributo agregado sem explodir quando ele não foi carregado.
     *
     * `Model::shouldBeStrict` transforma acesso a atributo ausente em exceção —
     * o que é ótimo para pegar N+1, e exige perguntar antes de ler aquilo que
     * só existe em algumas consultas.
     */
    private function carregado(string $atributo): bool
    {
        return (bool) (array_key_exists($atributo, $this->resource->getAttributes())
            ? $this->resource->getAttributes()[$atributo]
            : false);
    }
}
