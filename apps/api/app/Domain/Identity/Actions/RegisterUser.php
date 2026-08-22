<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Data\RegisterUserData;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Cria uma conta de leitor.
 *
 * O papel `member` é atribuído aqui, e não por um observer, para que a conta
 * nunca exista sem papel — nem por um instante, nem se o cadastro falhar no meio.
 */
final class RegisterUser
{
    public function execute(RegisterUserData $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
            ]);

            $user->assignRole(Role::Member->value);

            return $user;
        });
    }
}
