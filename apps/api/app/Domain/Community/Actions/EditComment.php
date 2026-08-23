<?php

declare(strict_types=1);

namespace App\Domain\Community\Actions;

use App\Domain\Community\Models\Comment;

final class EditComment
{
    /**
     * Reescreve o texto e marca a hora da edição.
     *
     * `edited_at` não é enfeite: numa conversa pública, alterar o que se disse
     * depois de alguém responder muda o sentido da resposta alheia. A marca é
     * o mínimo de honestidade — e é por isso que ela é gravada aqui, junto da
     * escrita, e não deixada a cargo de quem chama.
     *
     * `forceFill` porque `edited_at` fica fora do `$fillable` de propósito:
     * é campo que o sistema decide, e nunca deve poder chegar pelo corpo de
     * uma requisição.
     */
    public function execute(Comment $comment, string $body): Comment
    {
        $comment->forceFill([
            'body' => trim($body),
            'edited_at' => now(),
        ])->save();

        return $comment->refresh();
    }
}
