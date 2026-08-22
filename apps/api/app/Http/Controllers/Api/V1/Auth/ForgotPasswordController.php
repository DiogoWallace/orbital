<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\SendPasswordResetLink;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;

class ForgotPasswordController extends Controller
{
    /**
     * Resposta única, sempre 200.
     *
     * Cadastrado ou não, pedido repetido ou primeiro da vez: a resposta é
     * idêntica. É a mesma disciplina do login — nenhum endpoint público pode
     * dizer se um e-mail tem conta aqui.
     */
    public function __invoke(ForgotPasswordRequest $request, SendPasswordResetLink $sendLink): JsonResponse
    {
        $sendLink->execute((string) $request->string('email'));

        return response()->json([
            'data' => [
                'message' => 'Se houver uma conta com esse e-mail, o link de recuperação chega em instantes.',
            ],
        ]);
    }
}
