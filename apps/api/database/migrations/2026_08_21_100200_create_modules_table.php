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
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discipline_id')->constrained()->restrictOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('author_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('slug')->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->text('summary')->nullable();

            $table->string('kind', 32);
            $table->string('status', 16)->default('draft');
            $table->string('difficulty', 16)->default('introductory');

            // Chave que liga esta linha ao componente React (ADR 0005).
            // Nullable porque um módulo do tipo `article` não tem componente.
            $table->string('component_key', 64)->nullable();

            // Variáveis, faixas, unidades e presets (ADR 0006).
            $table->jsonb('spec')->default(DB::raw("'{}'::jsonb"));

            $table->unsignedSmallInteger('estimated_minutes')->nullable();
            $table->string('cover_path')->nullable();
            $table->timestamp('published_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Índice do catálogo público: status + data cobrem o scopePublished.
            $table->index(['status', 'published_at']);
            $table->index(['discipline_id', 'status']);
            $table->index('component_key');
        });

        // GIN torna o `spec` consultável de verdade — sem ele, o JSONB seria
        // apenas um blob opaco e a decisão do ADR 0006 não se sustentaria.
        DB::statement('CREATE INDEX modules_spec_gin_index ON modules USING gin (spec jsonb_path_ops)');

        // Busca tolerante a erro de digitação e a acento no título.
        DB::statement('CREATE INDEX modules_title_trgm_index ON modules USING gin (title gin_trgm_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
