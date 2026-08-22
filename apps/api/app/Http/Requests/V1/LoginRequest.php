<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            // Rótulo do token: distingue sessões ("web", "app") na revogação.
            'deviceName' => ['sometimes', 'string', 'max:64'],
        ];
    }
}
