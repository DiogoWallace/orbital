<?php

declare(strict_types=1);

namespace App\Domain\Community\Actions;

use App\Domain\Community\Enums\CommentStatus;
use App\Domain\Community\Models\Comment;

final class ModerateComment
{
    /**
     * Oculta ou devolve ao ar um comentário.
     *
     * Ocultar preserva a linha: o texto sai da leitura pública, mas continua no
     * banco. Apagar destruiria o contexto das respostas que vieram depois — e
     * moderação sem histórico não é auditável.
     *
     * Marcar as denúncias como revisadas é parte da mesma ação: fila de
     * moderação que não esvazia sozinha vira fila que ninguém abre.
     */
    public function execute(Comment $comment, CommentStatus $status): Comment
    {
        $comment->forceFill(['status' => $status])->save();

        $comment->reports()->whereNull('reviewed_at')->update(['reviewed_at' => now()]);

        return $comment->refresh();
    }
}
