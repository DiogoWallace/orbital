<?php

declare(strict_types=1);

use App\Domain\Identity\Support\UsernameGenerator;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Identidade pública do usuário.
 *
 * Até aqui uma conta só tinha nome e e-mail. Nome não serve de endereço — muda,
 * repete e às vezes é o nome civil de alguém que não quer ser encontrado por
 * ele. E-mail não entra em URL nunca.
 *
 * O `username` é o identificador público estável: a pessoa pode reescrever o
 * nome de exibição sem quebrar o link do próprio perfil.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Nulável na criação da coluna porque as contas existentes ainda
            // não têm um; o backfill logo abaixo preenche todas, e só então a
            // coluna passa a ser obrigatória.
            $table->string('username', 32)->nullable()->unique()->after('name');
            $table->string('bio', 280)->nullable()->after('username');
            $table->string('avatar_path')->nullable()->after('bio');
        });

        $this->preencherUsernames();

        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 32)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'bio', 'avatar_path']);
        });
    }

    /**
     * Gera um username para cada conta que já existia.
     *
     * Feito em PHP, e não em SQL: a regra de normalização e de desempate é a
     * mesma que vale para contas novas, e duplicá-la em SQL garantiria que as
     * duas divergissem na primeira mudança.
     */
    private function preencherUsernames(): void
    {
        $gerador = new UsernameGenerator;

        DB::table('users')
            ->whereNull('username')
            ->orderBy('id')
            ->each(function (object $user) use ($gerador): void {
                DB::table('users')->where('id', $user->id)->update([
                    'username' => $gerador->paraNomeOuEmail($user->name, $user->email),
                ]);
            });
    }
};
