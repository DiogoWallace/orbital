<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Data\RegisterUserData;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Auth\Events\Registered;
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
        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => $data->password,
            ]);

            $user->assignRole(Role::Member->value);

            return $user;
        });

        // Fora da transação, e não dentro: o e-mail de confirmação vai para a
        // fila do Redis, e um worker pode pegá-lo antes do commit — buscaria
        // um usuário que ainda não existe. Aqui a linha já está gravada.
        //
        // O listener é o que o Laravel registra para este evento. A conta
        // nasce utilizável (porta suave): dá para explorar e simular sem
        // confirmar, e só as ações que persistem exigem a confirmação.
        event(new Registered($user));

        return $user;
    }
}
