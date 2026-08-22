<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Identity\Actions\IssueApiToken;
use App\Domain\Identity\Actions\RegisterUser;
use App\Domain\Identity\Data\RegisterUserData;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\RegisterRequest;
use App\Http\Resources\V1\UserResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function __invoke(
        RegisterRequest $request,
        RegisterUser $registerUser,
        IssueApiToken $issueToken,
    ): JsonResponse {
        $user = $registerUser->execute(
            RegisterUserData::from($request->validated())
        );

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $issueToken->execute($user),
            ],
        ], JsonResponse::HTTP_CREATED);
    }
}
