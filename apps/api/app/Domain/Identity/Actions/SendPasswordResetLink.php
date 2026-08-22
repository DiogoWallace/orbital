<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use Illuminate\Support\Facades\Password;

/**
 * Dispara o e-mail de recuperação.
 *
 * Devolve `void` de propósito: o resultado do broker — e-mail inexistente,
 * pedido repetido cedo demais, envio feito — não pode chegar a quem pediu.
 * Distinguir os casos transformaria este endpoint num verificador de cadastro,
 * exatamente o que o LoginController evita ao gastar um hash em vão.
 *
 * O que aconteceu de fato vai para o log, onde só a operação vê.
 */
final class SendPasswordResetLink
{
    public function execute(string $email): void
    {
        $status = Password::sendResetLink(['email' => $email]);

        logger()->info('Pedido de recuperação de senha', [
            'email' => $email,
            'status' => $status,
        ]);
    }
}
