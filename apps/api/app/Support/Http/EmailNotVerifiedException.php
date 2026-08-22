<?php

declare(strict_types=1);

namespace App\Support\Http;

use RuntimeException;

/**
 * Exceção própria para "conta ainda não confirmada".
 *
 * Existe para que o erro tenha um `type` estável em RFC 7807, e não se
 * confunda com os outros 403 da API. Assim o frontend distingue "você não tem
 * permissão" de "falta confirmar seu e-mail" — que exigem respostas
 * completamente diferentes da interface — sem depender do texto da mensagem.
 */
final class EmailNotVerifiedException extends RuntimeException {}
