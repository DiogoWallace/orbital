<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mensagens de autenticação
|--------------------------------------------------------------------------
|
| `APP_LOCALE` é pt_BR desde o começo, mas sem estes arquivos o Laravel caía
| no inglês do framework — e o usuário via "These credentials do not match our
| records." numa interface inteiramente em português.
|
| Só as chaves que traduzimos precisam existir: as que faltarem continuam
| resolvendo pelo `fallback_locale`.
|
*/

return [
    'failed' => 'E-mail ou senha incorretos.',
    'password' => 'A senha informada está incorreta.',
    'throttle' => 'Tentativas demais. Tente de novo em :seconds segundos.',
];
