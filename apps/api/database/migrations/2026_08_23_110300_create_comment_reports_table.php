<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Denúncias de comentário.
 *
 * A moderação aqui é posterior à publicação (ADR 0013): o comentário entra no
 * ar na hora. Isso só funciona se houver como alguém apontar um problema sem
 * depender de a curadoria estar lendo tudo — esta tabela é essa via.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comment_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('reason', 24);
            $table->string('detail', 500)->nullable();

            // Quando a curadoria olhou. Nulo é o que a fila de moderação lista.
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();

            // Uma denúncia por pessoa por comentário: denunciar dez vezes não
            // pode valer dez vezes mais que a denúncia de dez pessoas.
            $table->unique(['comment_id', 'user_id']);
            $table->index('reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_reports');
    }
};
