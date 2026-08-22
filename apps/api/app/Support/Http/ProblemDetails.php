<?php

declare(strict_types=1);

namespace App\Support\Http;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Traduz exceções para RFC 7807 (application/problem+json).
 *
 * Um formato único de erro para toda a API significa que o cliente escreve o
 * tratamento uma vez. A alternativa — cada endpoint com seu formato — empurra
 * para o frontend a tarefa de adivinhar onde a mensagem está desta vez.
 */
final class ProblemDetails
{
    public static function fromThrowable(Throwable $e, Request $request): JsonResponse
    {
        [$status, $type, $title, $detail] = self::classify($e);

        $body = [
            'type' => $type,
            'title' => $title,
            'status' => $status,
            'detail' => $detail,
            'instance' => $request->getPathInfo(),
        ];

        if ($e instanceof ValidationException) {
            $body['errors'] = $e->errors();
        }

        // Rastro só fora de produção: em produção ele vira mapa de ataque.
        if (config('app.debug') && $status >= 500) {
            $body['exception'] = $e::class;
            $body['file'] = $e->getFile().':'.$e->getLine();
        }

        return response()->json($body, $status, [
            'Content-Type' => 'application/problem+json',
        ]);
    }

    /** @return array{int, string, string, string} */
    private static function classify(Throwable $e): array
    {
        return match (true) {
            $e instanceof ValidationException => [
                422,
                'https://orbital.local/problems/validation',
                'Dados inválidos',
                'Um ou mais campos não passaram na validação.',
            ],
            $e instanceof AuthenticationException => [
                401,
                'https://orbital.local/problems/unauthenticated',
                'Não autenticado',
                'Esta operação exige uma sessão válida.',
            ],
            $e instanceof EmailNotVerifiedException => [
                403,
                'https://orbital.local/problems/email-not-verified',
                'E-mail não confirmado',
                $e->getMessage(),
            ],
            $e instanceof AuthorizationException => [
                403,
                'https://orbital.local/problems/forbidden',
                'Acesso negado',
                $e->getMessage() ?: 'Você não tem permissão para esta operação.',
            ],
            $e instanceof ModelNotFoundException => [
                404,
                'https://orbital.local/problems/not-found',
                'Recurso não encontrado',
                'O recurso solicitado não existe ou não está disponível.',
            ],
            // A mensagem crua do framework não é repassada: o 404 do route model
            // binding, por exemplo, traz o nome completo da classe do model —
            // detalhe interno que não deve chegar ao cliente.
            $e instanceof HttpExceptionInterface => [
                $e->getStatusCode(),
                'https://orbital.local/problems/http',
                self::titleForStatus($e->getStatusCode()),
                config('app.debug')
                    ? ($e->getMessage() ?: self::detailForStatus($e->getStatusCode()))
                    : self::detailForStatus($e->getStatusCode()),
            ],
            default => [
                500,
                'https://orbital.local/problems/server-error',
                'Erro interno',
                config('app.debug')
                    ? $e->getMessage()
                    : 'Algo deu errado ao processar a requisição.',
            ],
        };
    }

    private static function detailForStatus(int $status): string
    {
        return match ($status) {
            404 => 'O recurso solicitado não existe ou não está disponível.',
            405 => 'Este método não é aceito neste endereço.',
            429 => 'Muitas requisições em pouco tempo. Tente novamente em instantes.',
            503 => 'Este recurso não está disponível neste ambiente.',
            default => self::titleForStatus($status),
        };
    }

    private static function titleForStatus(int $status): string
    {
        return match ($status) {
            400 => 'Requisição inválida',
            403 => 'Acesso negado',
            404 => 'Recurso não encontrado',
            405 => 'Método não permitido',
            409 => 'Conflito',
            429 => 'Muitas requisições',
            503 => 'Serviço indisponível',
            default => 'Erro na requisição',
        };
    }
}
