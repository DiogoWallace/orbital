<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\UpdateProfileRequest;
use App\Http\Resources\V1\PublicProfileResource;
use App\Http\Resources\V1\UserResource;

class ProfileController extends Controller
{
    /**
     * Perfil público de alguém, pelo `username`.
     *
     * Traz o que a pessoa escreveu, não o que ela leu ou curtiu: comentário é
     * fala pública desde que foi escrita, curtida é histórico de leitura.
     *
     * Comentários ocultos por moderação ficam de fora mesmo do perfil do
     * próprio autor nesta rota — a página é pública, e quem a abre não tem
     * como saber de quem ela é antes de carregar.
     */
    public function show(User $user): PublicProfileResource
    {
        $user->loadCount(['comments' => fn ($query) => $query->visible()])
            ->load([
                'comments' => fn ($query) => $query->visible()
                    ->with(['post:id,slug,title', 'author'])
                    ->withCount('likes')
                    ->latest()
                    ->limit(10),
                'posts' => fn ($query) => $query->published()->latest('published_at')->limit(5),
            ]);

        return new PublicProfileResource($user);
    }

    /** Edição do próprio perfil. */
    public function update(UpdateProfileRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $user->fill($request->safe()->only(['name', 'username', 'bio']))->save();

        return new UserResource($user->refresh());
    }
}
