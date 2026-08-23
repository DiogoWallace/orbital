<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Posts do blog.
 *
 * Tabela própria, e não um `kind` a mais em `modules`: um módulo é uma
 * experiência interativa com `spec`, componente e dificuldade; um post é
 * texto com data. Forçar os dois no mesmo lugar encheria as duas metades de
 * coluna nula e faria o catálogo e o blog brigarem por cada filtro novo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('slug')->unique();
            $table->string('title');
            // A chamada da listagem e do compartilhamento. Separada do corpo
            // porque cortar o primeiro parágrafo dá resumo ruim.
            $table->text('excerpt')->nullable();
            $table->text('body');

            $table->string('status', 16)->default('draft');
            $table->timestamp('published_at')->nullable();

            $table->string('cover_path')->nullable();
            // O crédito viaja junto da capa. Imagem de terceiro sem crédito ao
            // lado é violação de licença esperando acontecer, e uma coluna
            // separada seria fácil demais de esquecer de preencher.
            $table->string('cover_credit')->nullable();
            $table->string('cover_source')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Cobre o recorte público, que é sempre status + data.
            $table->index(['status', 'published_at']);
        });

        Schema::create('post_tag', function (Blueprint $table) {
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();

            $table->primary(['post_id', 'tag_id']);
            $table->index('tag_id');
        });

        // Mesma busca tolerante a acento e erro de digitação do catálogo.
        DB::statement('CREATE INDEX posts_title_trgm_index ON posts USING gin (title gin_trgm_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('post_tag');
        Schema::dropIfExists('posts');
    }
};
