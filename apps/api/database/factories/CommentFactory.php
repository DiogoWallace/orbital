<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Community\Enums\CommentStatus;
use App\Domain\Community\Models\Comment;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comment>
 */
class CommentFactory extends Factory
{
    protected $model = Comment::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'post_id' => Post::factory(),
            'user_id' => User::factory(),
            'parent_id' => null,
            'body' => $this->faker->paragraph(),
            'status' => CommentStatus::Visible,
        ];
    }

    public function hidden(): static
    {
        return $this->state(fn () => ['status' => CommentStatus::Hidden]);
    }

    public function replyTo(Comment $parent): static
    {
        return $this->state(fn () => [
            'post_id' => $parent->post_id,
            'parent_id' => $parent->id,
        ]);
    }
}
