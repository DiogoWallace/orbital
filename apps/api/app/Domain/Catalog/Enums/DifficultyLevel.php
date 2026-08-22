<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Enums;

enum DifficultyLevel: string
{
    case Introductory = 'introductory';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';

    public function label(): string
    {
        return match ($this) {
            self::Introductory => 'Introdutório',
            self::Intermediate => 'Intermediário',
            self::Advanced => 'Avançado',
        };
    }
}
