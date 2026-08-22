<?php

declare(strict_types=1);

namespace App\Domain\Identity\Models;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Notifications\ResetPasswordNotification;
use App\Domain\Projects\Models\Project;
use App\Domain\Simulation\Models\SimulationRun;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Troca a notificação padrão do Laravel pela nossa.
     *
     * A do framework monta um link para uma rota web que não existe aqui: esta
     * é uma API sem telas. O link precisa apontar para o Next (ADR 0004).
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /** Módulos que este usuário assina como autor. */
    public function authoredModules(): HasMany
    {
        return $this->hasMany(Module::class, 'author_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'owner_id');
    }

    public function simulationRuns(): HasMany
    {
        return $this->hasMany(SimulationRun::class);
    }

    /**
     * Pode ver módulos ainda não publicados e editar o catálogo.
     *
     * Centralizado aqui para que as policies não repitam a mesma composição de
     * papéis — mudar a regra é mudar um lugar só.
     */
    public function isCurator(): bool
    {
        return $this->hasAnyRole([Role::Admin->value, Role::Curator->value]);
    }
}
