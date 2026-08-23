<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        // A conta de desenvolvimento é criada antes do conteúdo, e não depois,
        // porque o PostSeeder assina os textos com o primeiro administrador que
        // encontrar. Em produção ela não existe, e os posts ficam sem autor —
        // que é o correto: lá a autoria é de quem escreveu de verdade.
        $this->criarContaDeDesenvolvimento();

        $this->call([
            DisciplineSeeder::class,
            ModuleSeeder::class,
            ProjectSeeder::class,
            PostSeeder::class,
        ]);
    }

    /**
     * Conta de desenvolvimento. Existe só fora de produção — o seeder é
     * rodado em deploy para popular a taxonomia, e uma credencial conhecida
     * em produção seria uma porta aberta.
     */
    private function criarContaDeDesenvolvimento(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@orbital.local'],
            ['name' => 'Curadoria Orbital', 'password' => 'password'],
        );

        $admin->syncRoles([Role::Admin->value]);
    }
}
