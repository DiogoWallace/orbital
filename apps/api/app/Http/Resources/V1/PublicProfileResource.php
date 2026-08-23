<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Identity\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Perfil público de alguém.
 *
 * Substitui o {@see AuthorResource} onde há identidade navegável: além do nome,
 * carrega o `username`, que é o endereço da página.
 *
 * **O e-mail nunca entra aqui**, nem hasheado para gerar avatar de terceiros —
 * um hash de e-mail é reversível por dicionário e serve de identificador
 * cruzado entre sites.
 *
 * As curtidas que a pessoa **deu** também ficam de fora, de propósito: são
 * histórico de leitura, e expor isso transforma um gesto barato em declaração
 * pública. O que aparece é o que ela escreveu, que já era público quando
 * escreveu.
 *
 * @mixin User
 */
class PublicProfileResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'username' => $this->username,
            'name' => $this->name,
            'bio' => $this->bio,
            'avatarPath' => $this->avatar_path,
            'isCurator' => $this->isCurator(),
            'joinedAt' => $this->created_at?->toIso8601String(),
            'commentsCount' => $this->whenCounted('comments'),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'authoredPosts' => PostSummaryResource::collection($this->whenLoaded('posts')),
        ];
    }
}
