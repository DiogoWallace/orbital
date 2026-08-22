<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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

        $this->definePasswordPolicy();
    }

    /**
     * Política de senha da plataforma.
     *
     * Comprimento acima de tudo: 12 caracteres derrotam força bruta melhor do
     * que 8 com exigência de símbolo, e sem empurrar o usuário para o
     * "Senha1!" que ele reusa em todo lugar. Por isso `letters` e `numbers`
     * entram, e `symbols` e `mixedCase` ficam de fora.
     *
     * `uncompromised()` consulta o Have I Been Pwned por k-anonimato: só os
     * cinco primeiros caracteres do hash SHA-1 saem daqui, nunca a senha. Fica
     * restrito a produção porque é uma chamada de rede — em teste tornaria a
     * suíte dependente de internet, e em desenvolvimento atrasaria o cadastro
     * quando a máquina estiver offline.
     */
    private function definePasswordPolicy(): void
    {
        Password::defaults(function (): Password {
            $rule = Password::min(12)->letters()->numbers();

            return $this->app->isProduction()
                ? $rule->uncompromised()
                : $rule;
        });
    }
}
