<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Projects\Enums\ProjectKind;
use App\Domain\Projects\Enums\ProjectStatus;
use App\Domain\Projects\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(4);

        return [
            'owner_id' => null,
            'slug' => Str::slug($title),
            'title' => rtrim($title, '.'),
            'summary' => fake()->paragraph(),
            'description' => fake()->paragraphs(3, true),
            'kind' => ProjectKind::Research,
            'status' => ProjectStatus::Planned,
            'started_at' => now()->subMonths(2),
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => ProjectStatus::Published,
            'published_at' => now()->subDay(),
        ]);
    }
}
