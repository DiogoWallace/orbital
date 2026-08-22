<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreSimulationRunRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'moduleSlug' => ['required', 'string', 'exists:modules,slug'],
            'label' => ['nullable', 'string', 'max:120'],

            // A forma de `parameters` é definida pelo `spec` do módulo, não por
            // este request (ADR 0006). O limite de tamanho existe porque o
            // conteúdo é livre: sem teto, um cliente poderia gravar megabytes.
            'parameters' => ['required', 'array', 'max:64'],
            'parameters.*' => ['nullable', $this->scalarRule()],

            'result' => ['nullable', 'array'],
            'result.summary' => ['nullable', 'array', 'max:64'],

            'modelVersion' => ['required', 'string', 'max:32'],
            'isPublic' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Um valor de parâmetro é escalar — número, texto curto ou booleano.
     *
     * Estruturas aninhadas são recusadas de propósito: `parameters` é a entrada
     * de uma simulação, não um documento arbitrário.
     */
    private function scalarRule(): callable
    {
        return function (string $attribute, mixed $value, callable $fail): void {
            if (! is_scalar($value)) {
                $fail("O parâmetro [{$attribute}] deve ser um número, texto ou booleano.");

                return;
            }

            if (is_string($value) && mb_strlen($value) > 120) {
                $fail("O parâmetro [{$attribute}] excede 120 caracteres.");
            }
        };
    }
}
