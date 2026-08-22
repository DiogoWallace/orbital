<?php

declare(strict_types=1);

namespace App\Domain\Projects\Enums;

enum ProjectKind: string
{
    case Experiment = 'experiment';
    case Research = 'research';
    case Discovery = 'discovery';
    case Series = 'series';

    public function label(): string
    {
        return match ($this) {
            self::Experiment => 'Experimento',
            self::Research => 'Pesquisa',
            self::Discovery => 'Descoberta',
            self::Series => 'Série',
        };
    }
}
