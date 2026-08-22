<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tokens de verificação de e-mail.
 *
 * Espelha `password_reset_tokens` de propósito: mesma forma, mesmo ciclo de
 * vida, mesmo modelo mental. A alternativa seria a URL assinada do Laravel,
 * que amarra a assinatura ao host da API — e o link precisa apontar para o
 * frontend (ADR 0009).
 *
 * O e-mail é a chave primária: um pedido novo substitui o anterior, de modo
 * que só o último link enviado funciona.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            // Guardamos o hash, nunca o token. Um dump do banco não permite
            // verificar a conta de ninguém.
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_tokens');
    }
};
