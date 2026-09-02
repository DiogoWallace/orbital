<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A máscara de qualidade é decisão de processamento, e faltava na cadeia.
     *
     * Ela descarta cadências antes de a curva existir: dependendo do alvo, de
     * 0 a quase 40% da série. Duas curvas do mesmo arquivo com máscaras
     * diferentes têm o mesmo `sha256` — porque o FITS de origem é o mesmo — e
     * **não são o mesmo dado**. Sem esta coluna nada as distinguia, e a soma de
     * verificação, sozinha, dava uma falsa sensação de identidade.
     */
    public function up(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->string('quality_mask', 32)->nullable()->after('product');
        });
    }

    public function down(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->dropColumn('quality_mask');
        });
    }
};
