<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Editorial\Enums\PostStatus;
use App\Domain\Editorial\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = rtrim($this->faker->sentence(6), '.');

        return [
            'author_id' => null,
            'slug' => Str::slug($title).'-'.$this->faker->unique()->numberBetween(1, 99999),
            'title' => $title,
            'excerpt' => $this->faker->paragraph(),
            'body' => $this->faker->paragraphs(5, true),
            // O padrão é rascunho: um teste que quer post no ar diz isso
            // explicitamente, e nunca publica sem querer.
            'status' => PostStatus::Draft,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => PostStatus::Published,
            'published_at' => now()->subDays($this->faker->numberBetween(1, 90)),
        ]);
    }

    /** Publicado, mas com data no futuro: fora do feed até lá. */
    public function scheduled(): static
    {
        return $this->state(fn () => [
            'status' => PostStatus::Published,
            'published_at' => now()->addWeek(),
        ]);
    }
}
