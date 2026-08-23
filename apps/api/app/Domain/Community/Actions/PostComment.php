<?php

declare(strict_types=1);

namespace App\Domain\Community\Actions;

use App\Domain\Community\Models\Comment;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;

final class PostComment
{
    /**
     * Publica um comentário, ou uma resposta a um comentário existente.
     *
     * A conversa tem **uma camada**: responder a uma resposta não cria um
     * terceiro nível, prende no mesmo comentário raiz. Quem responde continua
     * falando com alguém — a menção no texto resolve para quem — e o layout
     * não afunda em indentação que, no celular, chega a três palavras por
     * linha.
     *
     * A regra vive aqui, e não no banco, porque é decisão de produto: mudar de
     * ideia sobre profundidade não deveria exigir migration.
     */
    public function execute(User $author, Post $post, string $body, ?Comment $parent = null): Comment
    {
        $raiz = $parent?->isRoot() === false
            ? $parent->parent
            : $parent;

        return Comment::create([
            'post_id' => $post->id,
            'user_id' => $author->id,
            'parent_id' => $raiz?->id,
            'body' => trim($body),
        ]);
    }
}
