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
        Schema::create('simulation_runs', function (Blueprint $table) {
            // UUID como chave: a execução é compartilhável por URL, e um id
            // sequencial exposto revelaria volume de uso e convidaria enumeração.
            $table->uuid('id')->primary();

            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()
                ->constrained()->cascadeOnDelete();

            $table->string('label')->nullable();

            $table->jsonb('parameters');
            $table->jsonb('result')->nullable();

            // Sem isto, uma execução salva hoje passaria a parecer errada depois
            // que a física do módulo fosse corrigida, sem explicação possível.
            $table->string('model_version', 32)->default('1.0.0');

            $table->boolean('is_public')->default(false);
            $table->timestamps();

            $table->index(['module_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        DB::statement('CREATE INDEX simulation_runs_parameters_gin_index ON simulation_runs USING gin (parameters jsonb_path_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_runs');
    }
};
