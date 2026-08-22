<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Catalog\Enums\SectionKind;
use App\Domain\Catalog\Models\Module;
use App\Domain\Catalog\Models\ModuleSection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ModuleSection>
 */
class ModuleSectionFactory extends Factory
{
    protected $model = ModuleSection::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = fake()->sentence(3);

        return [
            'module_id' => Module::factory(),
            'kind' => SectionKind::Text,
            'anchor' => Str::slug($title),
            'title' => rtrim($title, '.'),
            'body' => fake()->paragraphs(2, true),
            'meta' => null,
            'position' => fake()->numberBetween(0, 10),
        ];
    }
}
