<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Catalog\Models\Module;
use App\Domain\Identity\Models\User;
use App\Domain\Simulation\Models\SimulationRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SimulationRun>
 */
class SimulationRunFactory extends Factory
{
    protected $model = SimulationRun::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'user_id' => User::factory(),
            'label' => fake()->sentence(3),
            'parameters' => ['altitude' => 400, 'inclination' => 51.6],
            'result' => ['summary' => ['period' => 92.7]],
            'model_version' => '1.0.0',
            'is_public' => false,
        ];
    }

    public function public(): static
    {
        return $this->state(fn () => ['is_public' => true]);
    }
}
