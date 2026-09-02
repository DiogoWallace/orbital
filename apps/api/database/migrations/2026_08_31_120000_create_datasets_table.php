<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datasets', function (Blueprint $table) {
            $table->id();

            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary')->nullable();

            // --- Origem -------------------------------------------------
            // Estes campos não são metadados de conveniência: são o elo
            // "dataset → versão do dado" da cadeia do ADR 0014. Sem eles a
            // execução que usar esta série não é reproduzível, e por isso
            // quase nada aqui é nulável.
            $table->string('mission', 32);
            $table->string('instrument', 64);
            $table->string('pipeline', 64)->nullable();
            $table->string('product', 64)->nullable();

            $table->string('target', 128);
            $table->string('external_id', 64)->nullable();
            $table->unsignedSmallInteger('sector')->nullable();
            $table->unsignedInteger('cadence_seconds')->nullable();

            $table->string('source_archive', 128);
            $table->string('source_file')->nullable();

            // A soma do arquivo recebido. Se a missão reprocessar e
            // republicar, a soma muda e isto passa a ser outro dataset — não
            // uma atualização deste. É o que impede uma execução antiga de
            // apontar silenciosamente para dados diferentes dos que a
            // produziram.
            $table->string('sha256', 64)->nullable();

            $table->timestamp('retrieved_at');

            // Como citar. Fica nulável porque o texto vem dos termos vigentes
            // do arquivo de origem e precisa ser lido na fonte — inventar uma
            // frase seria a mesma procedência falsa que o resto disto evita.
            $table->text('citation')->nullable();

            // --- Forma da série -----------------------------------------
            $table->unsignedInteger('points')->default(0);
            $table->double('time_span_days')->nullable();

            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['mission', 'published_at']);
            $table->index('external_id');
        });

        Schema::create('dataset_series', function (Blueprint $table) {
            $table->id();

            // Um para um, e em tabela separada de propósito: listar o catálogo
            // de datasets não pode arrastar megabytes de série junto. Quem
            // quer os pontos pede os pontos.
            $table->foreignId('dataset_id')->unique()->constrained()->cascadeOnDelete();

            $table->jsonb('time');
            $table->jsonb('flux');

            $table->timestamps();
        });

        // O jsonb da série é grande e nunca é consultado por conteúdo: só é
        // lido inteiro. Guardar externo e comprimido evita inflar a tabela
        // principal e a linha de TOAST.
        DB::statement('ALTER TABLE dataset_series ALTER COLUMN time SET STORAGE EXTENDED');
        DB::statement('ALTER TABLE dataset_series ALTER COLUMN flux SET STORAGE EXTENDED');
    }

    public function down(): void
    {
        Schema::dropIfExists('dataset_series');
        Schema::dropIfExists('datasets');
    }
};
