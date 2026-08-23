<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Community\Actions\EditComment;
use App\Domain\Community\Actions\PostComment;
use App\Domain\Community\Models\Comment;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreCommentRequest;
use App\Http\Requests\V1\UpdateCommentRequest;
use App\Http\Resources\V1\CommentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CommentController extends Controller
{
    /**
     * O fio de um post, em duas camadas.
     *
     * Uma consulta traz raízes e respostas de uma vez: `with('replies')` sobre
     * os comentários raiz. Buscar as respostas comentário a comentário seria o
     * N+1 clássico de área de comentários — invisível com três comentários,
     * fatal com trezentos.
     */
    public function index(Request $request, Post $post): AnonymousResourceCollection
    {
        if (Gate::denies('view', $post)) {
            throw new NotFoundHttpException;
        }

        $viewer = $request->user();

        $comments = $post->comments()
            ->whereNull('parent_id')
            ->visible()
            ->with([
                'author',
                'replies' => fn ($query) => $query->visible()
                    ->with('author')
                    ->withCount('likes')
                    ->when($viewer, fn ($q) => $q->withExists([
                        'likes' => fn ($l) => $l->where('user_id', $viewer->id),
                    ])),
            ])
            ->withCount('likes')
            ->when($viewer, fn ($q) => $q->withExists([
                'likes' => fn ($l) => $l->where('user_id', $viewer->id),
            ]))
            ->oldest()
            ->paginate((int) $request->integer('perPage', 30));

        return CommentResource::collection($comments);
    }

    public function store(
        StoreCommentRequest $request,
        Post $post,
        PostComment $postComment,
    ): JsonResponse {
        // Comentar em rascunho alheio não deve nem parecer possível.
        if (Gate::denies('view', $post)) {
            throw new NotFoundHttpException;
        }

        $parent = $request->filled('parentId')
            ? $post->comments()->findOrFail($request->integer('parentId'))
            : null;

        /** @var User $user */
        $user = $request->user();

        $comment = $postComment->execute(
            $user,
            $post,
            (string) $request->string('body'),
            $parent,
        );

        $comment->load('author')->loadCount('likes');

        return (new CommentResource($comment))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function update(
        UpdateCommentRequest $request,
        Comment $comment,
        EditComment $editComment,
    ): CommentResource {
        Gate::authorize('update', $comment);

        $comment = $editComment->execute($comment, (string) $request->string('body'));

        $comment->load('author')->loadCount('likes');

        return new CommentResource($comment);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        Gate::authorize('delete', $comment);

        // Soft delete: as respostas continuam ancoradas, e a moderação
        // continua tendo o que auditar.
        $comment->delete();

        return response()->json(status: JsonResponse::HTTP_NO_CONTENT);
    }
}
