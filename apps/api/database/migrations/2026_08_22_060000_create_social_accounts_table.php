<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contas de provedores externos ligadas a um usuário.
 *
 * Tabela, e não uma coluna `google_id` em `users`: a mesma pessoa pode ligar
 * mais de um provedor, e o segundo provedor (GitHub, ORCID) não deve exigir
 * migration na tabela central.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32);
            // O identificador estável do provedor. Nunca o e-mail: e-mail muda,
            // e o `sub` do Google não.
            $table->string('provider_id');
            $table->timestamps();

            // Uma conta do provedor pertence a um usuário só. Sem isto, dois
            // usuários poderiam reivindicar o mesmo login do Google.
            $table->unique(['provider', 'provider_id']);
            $table->index(['user_id', 'provider']);
        });

        Schema::table('users', function (Blueprint $table) {
            // Quem entra pelo Google nunca escolhe senha. A coluna obrigatória
            // forçaria a inventar uma senha aleatória que ninguém conhece --
            // um segredo inútil guardado para sempre.
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');

        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
        });
    }
};
