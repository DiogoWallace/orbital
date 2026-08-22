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
| Os nomes em `attributes` carregam o artigo ("a senha"), porque em português
| a concordância exige. Onde o atributo abre a frase usamos `:Attribute`, que
| o Laravel substitui pela versão com inicial maiúscula — sem isso a mensagem
| sai como "a senha precisa ter pelo menos 12 caracteres.".
|
| As regras que não combinam com artigo — `email`, `confirmed` — foram
| reescritas sem o placeholder, em vez de forçar uma frase torta.
|
*/

return [
    'confirmed' => 'A confirmação não confere.',
    'email' => 'Endereço de e-mail inválido.',
    'max' => [
        'string' => ':Attribute não pode ter mais que :max caracteres.',
    ],
    'min' => [
        'string' => ':Attribute precisa ter pelo menos :min caracteres.',
    ],
    'required' => 'Informe :attribute.',
    'string' => ':Attribute precisa ser um texto.',
    'unique' => ':Attribute já está em uso.',

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
