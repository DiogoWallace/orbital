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
        $this->call([
            RoleSeeder::class,
            DisciplineSeeder::class,
            ModuleSeeder::class,
            ProjectSeeder::class,
        ]);

        // Conta de desenvolvimento. Existe só fora de produção — o seeder é
        // rodado em deploy para popular a taxonomia, e uma credencial conhecida
        // em produção seria uma porta aberta.
        if (! app()->isProduction()) {
            $admin = User::firstOrCreate(
                ['email' => 'admin@orbital.local'],
                ['name' => 'Curadoria Orbital', 'password' => 'password'],
            );

            $admin->syncRoles([Role::Admin->value]);
        }
    }
}
