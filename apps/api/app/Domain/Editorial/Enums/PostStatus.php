<?php

declare(strict_types=1);

namespace App\Domain\Editorial\Enums;

/**
 * Ciclo de vida de um post.
 *
 * Espelha `ModuleStatus` sem herdar dele: são domínios diferentes, e o dia em
 * que o blog precisar de um estado que o catálogo não tem — "agendado",
 * "despublicado" — a mudança não pode arrastar o catálogo junto.
 */
enum PostStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Rascunho',
            self::Published => 'Publicado',
            self::Archived => 'Arquivado',
        };
    }

    /** Visível para quem não é autor nem curador. */
    public function isPublic(): bool
    {
        return $this === self::Published;
    }
}
