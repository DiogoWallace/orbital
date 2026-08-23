<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Curtidas, polimórficas desde o começo.
 *
 * Uma tabela para post e comentário — e para o que vier depois, como uma
 * execução de simulação compartilhada. A alternativa, `post_likes` e
 * `comment_likes`, duplicaria a mesma regra de "uma por pessoa por coisa" em
 * dois lugares, e a terceira tabela seria escrita por copiar e colar.
 *
 * Não há coluna de contagem denormalizada. `withCount` resolve na consulta, e
 * contador em coluna é a categoria de dado que sai de sincronia — basta um
 * caminho de escrita esquecer de incrementar. Se o volume um dia justificar,
 * o momento de trocar será medido, não adivinhado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('likeable');
            $table->timestamps();

            // Curtir é binário: existe ou não existe. O índice único é o que
            // garante isso mesmo com dois cliques simultâneos — no banco, e
            // não só na aplicação.
            $table->unique(['user_id', 'likeable_type', 'likeable_id'], 'likes_unicas');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('likes');
    }
};
