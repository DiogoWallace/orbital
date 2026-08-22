<?php

declare(strict_types=1);

namespace App\Domain\Projects\Enums;

enum ProjectStatus: string
{
    case Planned = 'planned';
    case Active = 'active';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Planned => 'Planejado',
            self::Active => 'Em andamento',
            self::Published => 'Publicado',
            self::Archived => 'Arquivado',
        };
    }
}
