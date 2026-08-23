<?php

declare(strict_types=1);

namespace App\Domain\Community\Enums;

/**
 * Motivos de denúncia.
 *
 * Lista curta de propósito: quanto mais opções, menos gente escolhe a certa, e
 * o campo livre em `detail` cobre o que não couber aqui.
 */
enum ReportReason: string
{
    case Spam = 'spam';
    case Abuse = 'abuse';
    case OffTopic = 'off_topic';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Spam => 'Spam ou propaganda',
            self::Abuse => 'Ofensa ou assédio',
            self::OffTopic => 'Fora do assunto',
            self::Other => 'Outro motivo',
        };
    }
}
