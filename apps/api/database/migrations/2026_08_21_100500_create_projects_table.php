<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->text('description')->nullable();

            $table->string('kind', 24)->default('research');
            $table->string('status', 16)->default('planned');

            $table->string('cover_path')->nullable();
            $table->date('started_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
        });

        Schema::create('module_project', function (Blueprint $table) {
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();

            // A ordem é conteúdo: um projeto conta uma história em sequência.
            $table->unsignedSmallInteger('position')->default(0);

            $table->primary(['project_id', 'module_id']);
            $table->index('module_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_project');
        Schema::dropIfExists('projects');
    }
};
