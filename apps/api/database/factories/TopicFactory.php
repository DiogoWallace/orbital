<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Catalog\Models\Discipline;
use App\Domain\Catalog\Models\Topic;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Topic>
 */
class TopicFactory extends Factory
{
    protected $model = Topic::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'discipline_id' => Discipline::factory(),
            'parent_id' => null,
            'slug' => Str::slug($name),
            'name' => Str::title($name),
            'description' => fake()->sentence(),
            'position' => fake()->numberBetween(0, 10),
        ];
    }
}
