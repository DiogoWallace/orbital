<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Community\Actions\ToggleLike;
use App\Domain\Community\Models\Comment;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LikeController extends Controller
{
    /**
     * Alterna a curtida em um post.
     *
     * Um endpoint que alterna, e não um par POST/DELETE: curtir é um botão só,
     * e o cliente que perde a resposta do primeiro clique não fica com o
     * estado invertido em relação ao servidor — ele consulta e recebe a
     * verdade de volta.
     */
    public function post(Request $request, Post $post, ToggleLike $toggle): JsonResponse
    {
        if (Gate::denies('view', $post)) {
            throw new NotFoundHttpException;
        }

        return $this->alternar($request, $post, $toggle);
    }

    public function comment(Request $request, Comment $comment, ToggleLike $toggle): JsonResponse
    {
        if (Gate::denies('view', $comment)) {
            throw new NotFoundHttpException;
        }

        return $this->alternar($request, $comment, $toggle);
    }

    private function alternar(Request $request, Model $likeable, ToggleLike $toggle): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $liked = $toggle->execute($user, $likeable);

        // A contagem volta junto: é o número que a interface precisa mostrar,
        // e devolvê-lo aqui evita uma segunda requisição a cada clique.
        return response()->json([
            'data' => [
                'liked' => $liked,
                'likesCount' => $likeable->likes()->count(),
            ],
        ]);
    }
}
