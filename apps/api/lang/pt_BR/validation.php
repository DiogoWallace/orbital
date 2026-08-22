<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mensagens de validação
|--------------------------------------------------------------------------
|
| Parcial de propósito: aqui ficam as regras que a interface realmente exibe
| hoje. Chave que faltar cai no `fallback_locale`, então acrescentar tradução
| é aditivo — nunca quebra o que já existe.
|
| `attributes` é o que faz a diferença entre "O campo email é obrigatório" e
| "O e-mail é obrigatório".
|
*/

return [
    'confirmed' => 'A confirmação de :attribute não confere.',
    'email' => 'Informe um :attribute válido.',
    'max' => [
        'string' => ':attribute não pode ter mais que :max caracteres.',
    ],
    'min' => [
        'string' => ':attribute precisa ter pelo menos :min caracteres.',
    ],
    'required' => 'Informe :attribute.',
    'string' => ':attribute precisa ser um texto.',
    'unique' => 'Este :attribute já está em uso.',

    // Regra `Password`, decomposta em mensagens próprias.
    'password' => [
        'letters' => 'A senha precisa conter ao menos uma letra.',
        'mixed' => 'A senha precisa conter maiúscula e minúscula.',
        'numbers' => 'A senha precisa conter ao menos um número.',
        'symbols' => 'A senha precisa conter ao menos um símbolo.',
        'uncompromised' => 'Esta senha apareceu em um vazamento de dados conhecido. Escolha outra.',
    ],

    'attributes' => [
        'email' => 'o e-mail',
        'name' => 'o nome',
        'password' => 'a senha',
        'password_confirmation' => 'a confirmação da senha',
        'token' => 'o token',
    ],
];
