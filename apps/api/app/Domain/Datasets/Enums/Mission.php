<?php

declare(strict_types=1);

namespace App\Domain\Datasets\Enums;

/**
 * De onde o dado veio.
 *
 * Enum, e não string livre, porque missão é taxonomia: ela aparece em filtro,
 * em rótulo e na citação, e um `TESS` convivendo com `Tess` e `tess` no banco
 * quebraria os três de uma vez.
 *
 * A lista é curta de propósito. Acrescentar JWST ou Gaia é acrescentar um caso
 * aqui, no dia em que houver dado dessas missões — e não antes.
 */
enum Mission: string
{
    case Tess = 'tess';

    public function label(): string
    {
        return match ($this) {
            self::Tess => 'TESS',
        };
    }

    /** Nome por extenso, para a linha de crédito. */
    public function fullName(): string
    {
        return match ($this) {
            self::Tess => 'Transiting Exoplanet Survey Satellite',
        };
    }
}
