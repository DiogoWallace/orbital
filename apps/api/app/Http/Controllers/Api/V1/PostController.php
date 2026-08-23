<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Editorial\Models\Post;
use App\Domain\Editorial\Queries\PostFeedQuery;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PostResource;
use App\Http\Resources\V1\PostSummaryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PostController extends Controller
{
    /**
     * Feed do blog.
     *
     * Filtros: `filter[tag]`, `filter[search]`.
     * Ordenação: `sort=title|publishedAt` (prefixo `-` inverte).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = (new PostFeedQuery($request->user()))
            ->paginate((int) $request->integer('perPage', 10));

        return PostSummaryResource::collection($posts);
    }

    public function show(Request $request, Post $post): PostResource
    {
        // Mesma escolha do catálogo: quem não pode ver recebe 404, não 403.
        // Um 403 confirmaria que aquele slug existe, e a existência de um
        // rascunho já é informação.
        if (Gate::denies('view', $post)) {
            throw new NotFoundHttpException;
        }

        $post->load(['author', 'tags'])
            ->loadCount([
                'likes',
                // Só o que está visível conta: comentário oculto por moderação
                // não pode inflar o número que a página exibe.
                'comments' => fn ($query) => $query->visible(),
            ]);

        if ($viewer = $request->user()) {
            $post->loadExists([
                'likes' => fn ($query) => $query->where('user_id', $viewer->id),
            ]);
        }

        return new PostResource($post);
    }
}
