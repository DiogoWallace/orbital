<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],

            /*
             * O `username` é endereço público, então a forma é apertada de
             * propósito: minúsculas, números e underscore. Sem ponto (que
             * confunde com domínio), sem hífen no começo ou no fim, sem
             * maiúscula — `Ada` e `ada` seriam duas pessoas diferentes numa
             * URL que o usuário digita de memória.
             */
            'username' => [
                'sometimes',
                'string',
                'min:3',
                'max:32',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('users', 'username')->ignore($this->user()?->id),
            ],

            'bio' => ['sometimes', 'nullable', 'string', 'max:280'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'username.regex' => 'Use apenas letras minúsculas, números e _.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'username' => 'o nome de usuário',
            'bio' => 'a bio',
        ];
    }
}
