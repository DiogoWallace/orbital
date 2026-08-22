<?php

declare(strict_types=1);

namespace App\Domain\Identity\Enums;

/**
 * Papéis da plataforma.
 *
 * Enum em vez de strings soltas: seeder, policies e testes referenciam o mesmo
 * símbolo, e um papel renomeado quebra na compilação em vez de silenciosamente
 * negar acesso a todo mundo.
 */
enum Role: string
{
    /** Leitor autenticado: salva execuções, favorita, anota. */
    case Member = 'member';

    /** Autor de módulos e projetos. */
    case Contributor = 'contributor';

    /** Revisa e publica conteúdo de terceiros. */
    case Curator = 'curator';

    /** Acesso total. */
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Member => 'Membro',
            self::Contributor => 'Colaborador',
            self::Curator => 'Curador',
            self::Admin => 'Administrador',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }
}
