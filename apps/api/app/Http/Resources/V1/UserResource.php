<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Domain\Identity\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * O próprio usuário autenticado.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->getRoleNames()->values()->all(),
            'isCurator' => $this->isCurator(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
