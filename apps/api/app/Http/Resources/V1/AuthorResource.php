<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Identity\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Autoria pública de um módulo.
 *
 * Separado do {@see UserResource} porque este recurso aparece em páginas
 * anônimas: expõe nome e nada mais. E-mail nunca entra aqui.
 *
 * @mixin User
 */
class AuthorResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}
