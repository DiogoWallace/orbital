<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Enums;

enum ModuleStatus: string
{
    case Draft = 'draft';
    case Review = 'review';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Rascunho',
            self::Review => 'Em revisão',
            self::Published => 'Publicado',
            self::Archived => 'Arquivado',
        };
    }

    /** Visível para quem não é autor nem administrador. */
    public function isPublic(): bool
    {
        return $this === self::Published;
    }
}
