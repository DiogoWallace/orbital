<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mensagens do broker de recuperação de senha
|--------------------------------------------------------------------------
|
| Estas chegam ao usuário só na tela de nova senha. As respostas do endpoint
| de "esqueci minha senha" são sempre a mesma frase genérica, escrita no
| ForgotPasswordController — nenhum status daqui vaza para lá.
|
*/

return [
    'reset' => 'Senha alterada.',
    'sent' => 'Enviamos o link de recuperação.',
    'throttled' => 'Aguarde um pouco antes de tentar de novo.',
    'token' => 'Este link de recuperação não vale mais.',
    'user' => 'Não encontramos uma conta com esse e-mail.',
];
