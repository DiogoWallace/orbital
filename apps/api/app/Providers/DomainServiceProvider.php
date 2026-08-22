<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Catalog\Models\Module;
use App\Domain\Catalog\Policies\ModulePolicy;
use App\Domain\Simulation\Models\SimulationRun;
use App\Domain\Simulation\Policies\SimulationRunPolicy;
use App\Domain\Simulation\SimulationEngineRegistry;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Amarra o núcleo de domínio ao framework.
 *
 * O registro explícito de policies é necessário porque a descoberta automática
 * do Laravel assume `App\Models\X` → `App\Policies\XPolicy`, convenção que a
 * organização por domínio (ADR 0008) abandona de propósito.
 */
class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Singleton: os motores se registram no boot e valem por toda a request.
        $this->app->singleton(SimulationEngineRegistry::class);
    }

    public function boot(): void
    {
        Gate::policy(Module::class, ModulePolicy::class);
        Gate::policy(SimulationRun::class, SimulationRunPolicy::class);

        // Motores de simulação server-side se registram aqui, vindos de
        // app/Modules/<Nome>/. Vazio por ora — ver ADR 0007.
    }
}
