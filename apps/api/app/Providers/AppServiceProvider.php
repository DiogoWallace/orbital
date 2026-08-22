<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // A convenção do Laravel procura a factory a partir de App\Models\X.
        // Como os models vivem em domínios (ADR 0008), resolvemos pelo nome
        // curto da classe — assim `database/factories` continua plano.
        Factory::guessFactoryNamesUsing(
            fn (string $modelName) => 'Database\\Factories\\'.class_basename($modelName).'Factory'
        );

        // Fora de produção, transformamos em erro aquilo que normalmente passa
        // despercebido: lazy loading (origem de N+1), atribuição de coluna
        // inexistente e acesso a atributo não carregado.
        Model::shouldBeStrict(! $this->app->isProduction());
    }
}
