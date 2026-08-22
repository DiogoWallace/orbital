<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\ResetPassword;
use App\Domain\Identity\Data\ResetPasswordData;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class ResetPasswordController extends Controller
{
    public function __invoke(ResetPasswordRequest $request, ResetPassword $resetPassword): JsonResponse
    {
        $status = $resetPassword->execute(new ResetPasswordData(
            token: (string) $request->string('token'),
            email: (string) $request->string('email'),
            password: (string) $request->string('password'),
            passwordConfirmation: (string) $request->string('password_confirmation'),
        ));

        if ($status !== Password::PASSWORD_RESET) {
            // Token expirado, já usado, ou e-mail que não bate com o token:
            // uma mensagem só. Detalhar qual dos três falhou entregaria a
            // um atacante o retorno que ele precisa para calibrar a tentativa.
            throw ValidationException::withMessages([
                'token' => 'Este link de recuperação não vale mais. Peça um novo.',
            ]);
        }

        // Sem token na resposta: depois de trocar a senha, a pessoa passa pelo
        // login. Emitir sessão aqui daria a quem tem o link o mesmo poder de
        // quem sabe a senha nova, e o link circula por e-mail.
        return response()->json([
            'data' => [
                'message' => 'Senha alterada. Entre com a nova senha.',
            ],
        ]);
    }
}
