<?php

declare(strict_types=1);

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Data\SocialProfileData;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\SocialAccount;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Support\UsernameGenerator;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Resolve o usuário por trás de um login social.
 *
 * Três caminhos, nesta ordem:
 *
 * 1. **A conta do provedor já está ligada.** Entra direto.
 * 2. **Existe conta local com o mesmo e-mail.** Liga as duas — *desde que o
 *    provedor afirme ter verificado o endereço*. Essa condição é o que separa
 *    "o dono do e-mail está entrando por outro caminho" de "alguém criou uma
 *    conta no provedor com o e-mail alheio para assumir a conta daqui".
 * 3. **Ninguém.** Cria a conta, já verificada — o provedor acabou de provar a
 *    posse do endereço, que é exatamente o que a nossa verificação mede.
 */
final class FindOrCreateSocialUser
{
    public function __construct(private readonly UsernameGenerator $usernames) {}

    public function execute(SocialProfileData $profile): User
    {
        $conta = SocialAccount::where('provider', $profile->provider)
            ->where('provider_id', $profile->providerId)
            ->first();

        if ($conta !== null) {
            return $conta->user;
        }

        $existente = User::where('email', $profile->email)->first();

        if ($existente !== null) {
            if (! $profile->emailVerified) {
                throw new RuntimeException(
                    'Já existe uma conta com este e-mail, e o provedor não confirmou o endereço.'
                );
            }

            return $this->ligar($existente, $profile);
        }

        return $this->criar($profile);
    }

    private function ligar(User $user, SocialProfileData $profile): User
    {
        return DB::transaction(function () use ($user, $profile): User {
            $user->socialAccounts()->create([
                'provider' => $profile->provider,
                'provider_id' => $profile->providerId,
            ]);

            // O provedor verificou o endereço; a conta local que ainda estava
            // pendente passa a valer como confirmada.
            if (! $user->hasVerifiedEmail()) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            return $user;
        });
    }

    private function criar(SocialProfileData $profile): User
    {
        return DB::transaction(function () use ($profile): User {
            $user = User::create([
                'name' => $profile->name,
                'email' => $profile->email,
                'username' => $this->usernames->paraNomeOuEmail($profile->name, $profile->email),
                // Sem senha: quem entra por provedor externo não escolhe uma.
                // Se quiser senha depois, o caminho é a recuperação — que
                // funciona porque o endereço já está confirmado.
                'password' => null,
            ]);

            $user->forceFill([
                'email_verified_at' => $profile->emailVerified ? now() : null,
            ])->save();

            $user->assignRole(Role::Member->value);

            $user->socialAccounts()->create([
                'provider' => $profile->provider,
                'provider_id' => $profile->providerId,
            ]);

            return $user;
        });
    }
}
