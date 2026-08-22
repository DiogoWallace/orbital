<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    /**
     * Sem `exists:users,email`: a validação responderia "este e-mail não está
     * cadastrado", e o formulário de recuperação viraria um verificador de
     * quem tem conta na plataforma. Aqui só se checa a forma do endereço.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
        ];
    }
}
