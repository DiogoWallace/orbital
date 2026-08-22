<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discipline_id')->constrained()->cascadeOnDelete();

            // Auto-referência: a profundidade da árvore é decisão editorial.
            $table->foreignId('parent_id')->nullable()
                ->constrained('topics')->cascadeOnDelete();

            $table->string('slug');
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            // Slug único dentro da disciplina, não globalmente: "planetas" pode
            // existir em Astronomia e em Física sem colidir.
            $table->unique(['discipline_id', 'slug']);
            $table->index(['discipline_id', 'parent_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topics');
    }
};
