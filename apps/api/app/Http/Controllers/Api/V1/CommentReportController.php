<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Community\Actions\ReportComment;
use App\Domain\Community\Enums\ReportReason;
use App\Domain\Community\Models\Comment;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\ReportCommentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class CommentReportController extends Controller
{
    public function __invoke(
        ReportCommentRequest $request,
        Comment $comment,
        ReportComment $report,
    ): JsonResponse {
        Gate::authorize('report', $comment);

        /** @var User $user */
        $user = $request->user();

        $report->execute(
            $user,
            $comment,
            ReportReason::from((string) $request->string('reason')),
            $request->filled('detail') ? (string) $request->string('detail') : null,
        );

        // Sem eco do que foi denunciado nem de quantas denúncias existem: o
        // contador é informação de moderação, e quem denuncia não precisa
        // saber se foi o primeiro.
        return response()->json([
            'data' => ['message' => 'Denúncia registrada. A curadoria vai analisar.'],
        ]);
    }
}
