<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Teto de 2000 caracteres: o suficiente para um argumento inteiro,
            // e pouco o bastante para que ninguém publique um artigo na área
            // de comentários de outra pessoa.
            'body' => ['required', 'string', 'min:2', 'max:2000'],
            'parentId' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['body' => 'o comentário'];
    }
}
