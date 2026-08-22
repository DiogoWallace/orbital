<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class LogoutController extends Controller
{
    /**
     * Revoga apenas o token usado nesta requisição.
     *
     * Sair no navegador não deve derrubar as outras sessões do mesmo usuário —
     * revogar tudo é uma ação distinta, e deliberada.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(status: JsonResponse::HTTP_NO_CONTENT);
    }
}
