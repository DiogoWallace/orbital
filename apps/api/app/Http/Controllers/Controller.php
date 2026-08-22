<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

/**
 * Controllers da plataforma são finos por contrato (ADR 0008): validam pela
 * FormRequest, autorizam pela policy, delegam a regra a uma Action e devolvem
 * uma Resource. Um teste de arquitetura verifica isso no CI.
 */
abstract class Controller
{
    use AuthorizesRequests;
}
