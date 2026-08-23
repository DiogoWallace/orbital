<?php

declare(strict_types=1);

namespace App\Domain\Community\Actions;

use App\Domain\Community\Enums\ReportReason;
use App\Domain\Community\Models\Comment;
use App\Domain\Community\Models\CommentReport;
use App\Domain\Identity\Models\User;

final class ReportComment
{
    /**
     * Registra uma denúncia, ou atualiza a que já existia.
     *
     * Idempotente por pessoa: denunciar de novo troca o motivo em vez de somar
     * uma linha. Sem isso, dez cliques da mesma pessoa pesariam como dez
     * pessoas incomodadas, e a fila de moderação passaria a mentir sobre a
     * gravidade do que está na frente.
     *
     * A denúncia atualizada volta para a fila (`reviewed_at` nulo): se alguém
     * reclama de novo depois de a curadoria ter olhado, é sinal de que a
     * primeira leitura não resolveu.
     */
    public function execute(
        User $reporter,
        Comment $comment,
        ReportReason $reason,
        ?string $detail = null,
    ): CommentReport {
        $report = CommentReport::firstOrNew([
            'comment_id' => $comment->id,
            'user_id' => $reporter->id,
        ]);

        // `forceFill` porque `reviewed_at` fica fora do `$fillable`: é campo
        // de moderação, e nunca deve poder chegar pelo corpo da requisição.
        $report->forceFill([
            'reason' => $reason,
            'detail' => $detail,
            'reviewed_at' => null,
        ])->save();

        return $report;
    }
}
