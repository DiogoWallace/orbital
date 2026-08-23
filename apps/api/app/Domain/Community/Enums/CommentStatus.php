<?php

declare(strict_types=1);

namespace App\Domain\Community\Enums;

enum CommentStatus: string
{
    case Visible = 'visible';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::Visible => 'Visível',
            self::Hidden => 'Oculto',
        };
    }
}
