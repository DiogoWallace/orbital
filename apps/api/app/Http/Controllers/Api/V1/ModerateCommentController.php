<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Community\Actions\ModerateComment;
use App\Domain\Community\Enums\CommentStatus;
use App\Domain\Community\Models\Comment;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CommentResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ModerateCommentController extends Controller
{
    public function __invoke(Request $request, Comment $comment, ModerateComment $moderate): CommentResource
    {
        Gate::authorize('moderate', $comment);

        $request->validate(['status' => ['required', Rule::enum(CommentStatus::class)]]);

        $comment = $moderate->execute(
            $comment,
            CommentStatus::from((string) $request->string('status')),
        );

        $comment->load('author')->loadCount('likes');

        return new CommentResource($comment);
    }
}
