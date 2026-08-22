<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\SendEmailVerificationLink;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResendVerificationController extends Controller
{
    /**
     * Reenvia a confirmação para o usuário autenticado.
     *
     * Exige sessão de propósito, ao contrário da confirmação em si: aqui o
     * endereço de destino vem do token, não do corpo da requisição. Um
     * endpoint público que aceitasse um e-mail qualquer seria uma máquina de
     * mandar mensagem para terceiros com o nosso domínio no remetente.
     */
    public function __invoke(Request $request, SendEmailVerificationLink $sendLink): JsonResponse
    {
        $user = $request->user();

        if ($user instanceof User) {
            $sendLink->execute($user);
        }

        return response()->json([
            'data' => ['message' => 'Se a conta ainda não estiver confirmada, o link chega em instantes.'],
        ]);
    }
}
