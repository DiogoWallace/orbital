<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Datasets\Enums\Mission;
use App\Domain\Datasets\Models\Dataset;
use App\Domain\Datasets\Models\DatasetSeries;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dataset>
 */
class DatasetFactory extends Factory
{
    protected $model = Dataset::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $tic = (string) $this->faker->numberBetween(1_000_000, 999_999_999);
        $sector = $this->faker->numberBetween(1, 90);

        return [
            'slug' => "tess-tic{$tic}-s".str_pad((string) $sector, 2, '0', STR_PAD_LEFT),
            'title' => "TIC {$tic} · setor {$sector}",
            'summary' => null,
            'mission' => Mission::Tess,
            'instrument' => 'TESS Photometer',
            'pipeline' => 'SPOC',
            'product' => 'PDCSAP_FLUX',
            'quality_mask' => 'default',
            'target' => "TIC {$tic}",
            'external_id' => $tic,
            'sector' => $sector,
            'cadence_seconds' => 120,
            'source_archive' => 'MAST',
            'source_file' => "tess-s{$sector}-{$tic}.fits",
            'sha256' => hash('sha256', $tic.$sector),
            'retrieved_at' => now()->subDays($this->faker->numberBetween(1, 60)),
            'citation' => 'Citação de teste.',
            'points' => 0,
            'time_span_days' => null,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['published_at' => null]);
    }

    /** Sem soma de verificação nem citação: existe, mas não é citável. */
    public function unciteable(): static
    {
        return $this->state(fn () => ['sha256' => null, 'citation' => null]);
    }

    /**
     * Anexa uma série sintética simples.
     *
     * Determinística de propósito — o teste que compara valores não pode
     * depender de sorteio.
     */
    public function withSeries(int $points = 120): static
    {
        return $this->afterCreating(function (Dataset $dataset) use ($points): void {
            $time = [];
            $flux = [];

            for ($i = 0; $i < $points; $i++) {
                $time[] = round($i * 0.01, 6);
                $flux[] = round(1 + sin($i / 7) * 0.001, 8);
            }

            DatasetSeries::create([
                'dataset_id' => $dataset->id,
                'time' => $time,
                'flux' => $flux,
            ]);

            $dataset->update([
                'points' => $points,
                'time_span_days' => end($time) - $time[0],
            ]);
        });
    }
}
