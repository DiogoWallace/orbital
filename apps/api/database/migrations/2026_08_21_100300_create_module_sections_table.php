<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();

            $table->string('kind', 24)->default('text');

            // Âncora estável para deep-link: /modulos/x#camara-de-combustao
            // continua funcionando depois que o título é reescrito.
            $table->string('anchor', 96)->nullable();

            $table->string('title')->nullable();
            $table->text('body')->nullable();

            // Dados do bloco que não são texto: legenda e caminho da figura,
            // rótulo da fórmula, DOI da referência.
            $table->jsonb('meta')->nullable();

            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['module_id', 'position']);
            $table->unique(['module_id', 'anchor']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_sections');
    }
};
