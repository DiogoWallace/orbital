<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\IssueApiToken;
use App\Domain\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\LoginRequest;
use App\Http\Resources\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function __invoke(LoginRequest $request, IssueApiToken $issueToken): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        // Uma única mensagem para e-mail inexistente e senha errada: distinguir
        // os dois casos transforma o login num verificador de cadastro.
        // Quando não há usuário ainda assim gastamos um hash, para que o tempo
        // de resposta não denuncie quais e-mails existem.
        $password = (string) $request->string('password');

        $passwordMatches = $user === null
            ? (bool) Hash::make($password) && false
            : Hash::check($password, $user->password);

        if (! $passwordMatches) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $issueToken->execute(
                    $user,
                    (string) $request->string('deviceName', 'web'),
                ),
            ],
        ]);
    }
}
