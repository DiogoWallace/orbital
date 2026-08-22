<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Support\AuthExchangeTickets;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class ExchangeTicketController extends Controller
{
    /**
     * Troca o ticket do redirect pelo token de verdade.
     *
     * Quem chama é o BFF do Next, pela rede interna. O ticket vale um minuto e
     * some no primeiro uso: mesmo que vaze pelo histórico do navegador ou por
     * um Referer, chega tarde.
     */
    public function __invoke(Request $request, AuthExchangeTickets $tickets): JsonResponse
    {
        $request->validate(['ticket' => ['required', 'string']]);

        $token = $tickets->consume((string) $request->string('ticket'));

        if ($token === null) {
            throw ValidationException::withMessages([
                'ticket' => 'Este código de acesso não vale mais. Tente entrar de novo.',
            ]);
        }

        $user = PersonalAccessToken::findToken($token)?->tokenable;

        if ($user === null) {
            throw ValidationException::withMessages([
                'ticket' => 'Este código de acesso não vale mais. Tente entrar de novo.',
            ]);
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }
}
