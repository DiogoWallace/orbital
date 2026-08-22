<?php

declare(strict_types=1);

namespace App\Domain\Identity\Data;

use Spatie\LaravelData\Data;

/**
 * O perfil que um provedor externo devolve, reduzido ao que a plataforma usa.
 *
 * Escrito para não ser específico do Google: o dia em que entrar GitHub ou
 * ORCID, muda o cliente do provedor, não este contrato nem a action que o
 * consome.
 */
final class SocialProfileData extends Data
{
    public function __construct(
        /** `google`, e no futuro outros. */
        public string $provider,
        /** Identificador estável no provedor (`sub`, no Google). */
        public string $providerId,
        public string $email,
        public string $name,
        /**
         * Se o provedor afirma ter verificado o endereço.
         *
         * É o que decide se podemos ligar automaticamente a uma conta local
         * existente — sem isso, bastaria criar conta no provedor com o e-mail
         * de outra pessoa para assumir a conta dela aqui.
         */
        public bool $emailVerified,
    ) {}
}
