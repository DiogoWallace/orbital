<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Testes de arquitetura
|--------------------------------------------------------------------------
|
| As fronteiras do ADR 0008 só valem se forem verificadas. Estas regras falham
| o CI quando alguém as cruza — combinar em reunião não impede nada.
|
*/

arch('o domínio não conhece a camada HTTP')
    ->expect('App\Domain')
    ->not->toUse([
        'App\Http',
        'Illuminate\Http\Request',
        'Illuminate\Http\Resources\Json\JsonResource',
    ]);

arch('o domínio não depende de módulos específicos')
    ->expect('App\Domain')
    ->not->toUse('App\Modules');

arch('controllers não escrevem no banco diretamente')
    ->expect('App\Http\Controllers')
    ->not->toUse('Illuminate\Support\Facades\DB');

arch('actions expõem um único ponto de entrada')
    ->expect(['App\Domain\Identity\Actions', 'App\Domain\Simulation\Actions'])
    ->toHaveMethod('execute');

arch('a taxonomia é modelada com enums, não com strings soltas')
    ->expect(['App\Domain\Catalog\Enums', 'App\Domain\Projects\Enums', 'App\Domain\Identity\Enums'])
    ->toBeEnums();

arch('nada de depurador esquecido')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'print_r'])
    ->not->toBeUsed();

arch('todo o código de aplicação é tipado estritamente')
    ->expect('App')
    ->toUseStrictTypes();
