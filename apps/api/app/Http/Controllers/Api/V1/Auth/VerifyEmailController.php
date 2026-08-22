<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\VerifyEmail;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\VerifyEmailRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class VerifyEmailController extends Controller
{
    /**
     * Público, e não atrás de `auth:sanctum`.
     *
     * O link do e-mail costuma ser aberto no celular, ou em outro navegador,
     * onde não há sessão. Exigir login antes de confirmar transformaria a
     * confirmação num obstáculo em vez de um clique.
     */
    public function __invoke(VerifyEmailRequest $request, VerifyEmail $verifyEmail): JsonResponse
    {
        $verificado = $verifyEmail->execute(
            (string) $request->string('email'),
            (string) $request->string('token'),
        );

        if (! $verificado) {
            throw ValidationException::withMessages([
                'token' => 'Este link de confirmação não vale mais. Peça um novo pela plataforma.',
            ]);
        }

        return response()->json([
            'data' => ['message' => 'E-mail confirmado.'],
        ]);
    }
}
