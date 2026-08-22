<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalog\Models\Module;
use App\Domain\Projects\Enums\ProjectKind;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::updateOrCreate(
            ['slug' => 'como-um-foguete-funciona'],
            [
                'title' => 'Como um foguete funciona',
                'summary' => 'Uma sequência de módulos que parte da geometria da órbita, passa pelos sistemas do veículo e chega ao comportamento do motor em operação.',
                'description' => "O objetivo é responder uma pergunta simples com o rigor que ela merece: o que precisa acontecer, e em que ordem, para colocar massa em órbita.\n\nCada módulo do projeto isola um aspecto — trajetória, sistemas, propulsão — e pode ser estudado por conta própria. Em sequência, eles formam o argumento completo.",
                'kind' => ProjectKind::Research,
                'status' => ProjectStatus::Published,
                'started_at' => now()->subMonths(1),
                'published_at' => now()->subDay(),
            ],
        );

        $modules = Module::whereIn('slug', [
            'orbital-sandbox',
            'anatomia-de-um-foguete',
        ])->pluck('id', 'slug');

        $project->modules()->sync([
            $modules['orbital-sandbox'] => ['position' => 0],
            $modules['anatomia-de-um-foguete'] => ['position' => 1],
        ]);
    }
}
