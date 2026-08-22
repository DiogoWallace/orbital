<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Catalog\Enums\DifficultyLevel;
use App\Domain\Catalog\Enums\ModuleKind;
use App\Domain\Catalog\Enums\ModuleStatus;
use App\Domain\Catalog\Models\Discipline;
use App\Domain\Catalog\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Module>
 */
class ModuleFactory extends Factory
{
    protected $model = Module::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'discipline_id' => Discipline::factory(),
            'topic_id' => null,
            'author_id' => null,
            'slug' => Str::slug($title),
            'title' => rtrim($title, '.'),
            'subtitle' => fake()->sentence(5),
            'summary' => fake()->paragraph(),
            'kind' => ModuleKind::Simulation,
            'status' => ModuleStatus::Draft,
            'difficulty' => DifficultyLevel::Introductory,
            'component_key' => 'demo-module',
            'spec' => ['version' => '1.0.0', 'parameters' => [], 'outputs' => []],
            'estimated_minutes' => fake()->numberBetween(5, 40),
            'published_at' => null,
        ];
    }

    /** Estado "no catálogo": publicado e com data no passado. */
    public function published(): static
    {
        return $this->state(fn () => [
            'status' => ModuleStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }

    /** Publicado, porém com data futura — não deve aparecer no catálogo. */
    public function scheduled(): static
    {
        return $this->state(fn () => [
            'status' => ModuleStatus::Published,
            'published_at' => now()->addWeek(),
        ]);
    }
}
