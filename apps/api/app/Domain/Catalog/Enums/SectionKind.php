<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Enums;

/**
 * Tipos de bloco de conteúdo de um módulo.
 *
 * Blocos, e não um único campo de HTML, porque o frontend precisa renderizar
 * fórmula com KaTeX, figura com legenda e destaque com estilo próprio — cada um
 * com semântica diferente e acessibilidade diferente.
 */
enum SectionKind: string
{
    case Text = 'text';
    case Formula = 'formula';
    case Figure = 'figure';
    case Callout = 'callout';
    case Reference = 'reference';
}
