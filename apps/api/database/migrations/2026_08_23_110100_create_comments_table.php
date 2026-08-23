<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Comentários dos posts, em uma camada de respostas.
 *
 * `parent_id` aponta para um comentário raiz e nada mais fundo que isso — a
 * regra é da aplicação, não do banco, e está em `PostComment`. Árvore livre
 * ficaria ilegível no celular a partir da terceira camada, e a conversa real de
 * um blog não passa de "alguém comentou, alguém respondeu".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Resposta a um comentário raiz. Nulo é o próprio comentário raiz.
            $table->foreignId('parent_id')->nullable()
                ->constrained('comments')->cascadeOnDelete();

            $table->text('body');

            // `visible` ou `hidden`. Ocultar é ato de curadoria e preserva o
            // registro: apagar de verdade destruiria o contexto das respostas
            // que vieram depois.
            $table->string('status', 16)->default('visible');

            // Quando o autor editou. Nulo significa nunca editado — e a
            // interface mostra "editado" a partir disso, que é honestidade
            // mínima numa conversa pública.
            $table->timestamp('edited_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // O fio de um post, em ordem: é a leitura que acontece toda vez.
            $table->index(['post_id', 'created_at']);
            $table->index(['parent_id', 'created_at']);
            // Alimenta o perfil público: os comentários recentes de alguém.
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
