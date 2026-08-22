<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Catalog\Models\Discipline;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Discipline>
 */
class DisciplineFactory extends Factory
{
    protected $model = Discipline::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'slug' => Str::slug($name),
            'name' => Str::title($name),
            'tagline' => fake()->sentence(6),
            'description' => fake()->paragraph(),
            'accent' => fake()->randomElement(['cyan', 'amber', 'violet', 'emerald']),
            'icon' => 'atom',
            'position' => fake()->numberBetween(0, 10),
        ];
    }
}
