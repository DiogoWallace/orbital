<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalog\Enums\DifficultyLevel;
use App\Domain\Catalog\Enums\ModuleKind;
use App\Domain\Catalog\Enums\ModuleStatus;
use App\Domain\Catalog\Enums\SectionKind;
use App\Domain\Catalog\Models\Discipline;
use App\Domain\Catalog\Models\Module;
use App\Domain\Catalog\Models\ModuleSection;
use App\Domain\Catalog\Models\Tag;
use App\Domain\Catalog\Models\Topic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Módulos iniciais do catálogo.
 *
 * `orbital-sandbox` é a implementação de referência: existe para provar o
 * contrato ponta a ponta (linha no banco → registry → componente → simulação).
 * Os demais existem como rascunho, para que o catálogo mostre os estados reais
 * do fluxo editorial em vez de um catálogo artificialmente perfeito.
 */
class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->modules() as $definition) {
            $discipline = Discipline::where('slug', $definition['discipline'])->firstOrFail();

            $topic = Topic::where('discipline_id', $discipline->id)
                ->where('slug', $definition['topic'])
                ->first();

            $module = Module::updateOrCreate(
                ['slug' => $definition['slug']],
                [
                    'discipline_id' => $discipline->id,
                    'topic_id' => $topic?->id,
                    'title' => $definition['title'],
                    'subtitle' => $definition['subtitle'],
                    'summary' => $definition['summary'],
                    'kind' => $definition['kind'],
                    'status' => $definition['status'],
                    'difficulty' => $definition['difficulty'],
                    'component_key' => $definition['componentKey'],
                    'spec' => $definition['spec'],
                    'estimated_minutes' => $definition['minutes'],
                    'published_at' => $definition['status'] === ModuleStatus::Published
                        ? now()->subDays($definition['publishedDaysAgo'] ?? 1)
                        : null,
                ],
            );

            $tagIds = collect($definition['tags'])
                ->map(fn (string $name) => Tag::firstOrCreate(
                    ['slug' => Str::slug($name)],
                    ['name' => $name],
                )->id);

            $module->tags()->sync($tagIds);

            $module->sections()->delete();

            foreach ($definition['sections'] as $position => $section) {
                ModuleSection::create([
                    'module_id' => $module->id,
                    'kind' => $section['kind'],
                    'anchor' => Str::slug($section['title']),
                    'title' => $section['title'],
                    'body' => $section['body'],
                    'meta' => $section['meta'] ?? null,
                    'position' => $position,
                ]);
            }
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function modules(): array
    {
        return [
            [
                'slug' => 'orbital-sandbox',
                'discipline' => 'astronomia',
                'topic' => 'mecanica-orbital',
                'title' => 'Laboratório orbital',
                'subtitle' => 'Como velocidade e altitude decidem a forma de uma órbita',
                'summary' => 'Ajuste a velocidade inicial de um satélite e observe a órbita mudar de circular para elíptica e, além de certo ponto, deixar de ser órbita. A integração roda no navegador, quadro a quadro.',
                'kind' => ModuleKind::Simulation,
                'status' => ModuleStatus::Published,
                'difficulty' => DifficultyLevel::Introductory,
                'componentKey' => 'orbital-sandbox',
                'minutes' => 12,
                'publishedDaysAgo' => 2,
                'tags' => ['Órbitas', 'Gravitação', 'Simulação'],
                'spec' => self::orbitalSandboxSpec(),
                'sections' => [
                    [
                        'kind' => SectionKind::Text,
                        'title' => 'O problema de dois corpos',
                        'body' => "Um satélite em órbita está em queda livre permanente. A única força relevante é a atração gravitacional do corpo central, e o movimento resultante é uma cônica: círculo, elipse, parábola ou hipérbole.\n\nO que separa esses quatro casos não é o tipo de força — é a energia. Com velocidade de menos, a trajetória fecha; com velocidade de mais, ela escapa.",
                    ],
                    [
                        'kind' => SectionKind::Formula,
                        'title' => 'Velocidade circular',
                        'body' => 'v_c = \\sqrt{\\frac{GM}{r}}',
                        'meta' => ['caption' => 'Velocidade necessária para manter órbita circular a uma distância r do centro do corpo.'],
                    ],
                    [
                        'kind' => SectionKind::Text,
                        'title' => 'O que observar',
                        'body' => "Comece no preset de órbita baixa e aumente a velocidade em passos pequenos.\n\nAté cerca de 1,41 vezes a velocidade circular, a órbita continua fechada — só fica cada vez mais alongada. Ao cruzar √2 vezes esse valor, a energia específica passa a ser positiva e a trajetória deixa de retornar: é a velocidade de escape.",
                    ],
                    [
                        'kind' => SectionKind::Callout,
                        'title' => 'Limites do modelo',
                        'body' => 'A simulação considera dois corpos pontuais, sem arrasto atmosférico, sem achatamento do corpo central e sem perturbações de terceiros corpos. É suficiente para a intuição geométrica da órbita, e insuficiente para planejar uma missão real.',
                        'meta' => ['tone' => 'warning'],
                    ],
                ],
            ],
            [
                'slug' => 'anatomia-de-um-foguete',
                'discipline' => 'engenharia',
                'topic' => 'foguetes',
                'title' => 'Anatomia de um foguete',
                'subtitle' => 'Cada sistema, o que ele faz e por que ele existe',
                'summary' => 'Um corte interativo de um veículo lançador: selecione um sistema — câmara de combustão, turbobomba, tanques, refrigeração regenerativa — e entenda sua função dentro do conjunto.',
                'kind' => ModuleKind::Visualization,
                'status' => ModuleStatus::Draft,
                'difficulty' => DifficultyLevel::Intermediate,
                'componentKey' => 'rocket-anatomy',
                'minutes' => 20,
                'tags' => ['Propulsão', 'Foguetes', 'Sistemas'],
                'spec' => self::rocketAnatomySpec(),
                'sections' => [
                    [
                        'kind' => SectionKind::Text,
                        'title' => 'Um foguete é um sistema de sistemas',
                        'body' => 'Nenhuma parte de um lançador faz sentido isolada. A pressão que a turbobomba entrega existe porque a câmara precisa dela; a refrigeração regenerativa existe porque a parede da câmara não sobreviveria sem ela — e ela usa como refrigerante o mesmo combustível que será queimado a seguir.',
                    ],
                ],
            ],
            [
                'slug' => 'transito-de-exoplanetas',
                'discipline' => 'dados',
                'topic' => 'series-temporais',
                'title' => 'Trânsito de exoplanetas',
                'subtitle' => 'Encontrar um planeta em uma curva de luz',
                'summary' => 'Explorador de curvas de luz: filtre ruído, identifique quedas periódicas de brilho e estime raio e período orbital a partir da série temporal.',
                'kind' => ModuleKind::DatasetExplorer,
                'status' => ModuleStatus::Draft,
                'difficulty' => DifficultyLevel::Advanced,
                'componentKey' => 'transit-explorer',
                'minutes' => 25,
                'tags' => ['Exoplanetas', 'Séries temporais', 'Fotometria'],
                'spec' => ['version' => '0.1.0', 'parameters' => [], 'outputs' => []],
                'sections' => [],
            ],
            [
                'slug' => 'geometria-molecular',
                'discipline' => 'quimica',
                'topic' => 'moleculas',
                'title' => 'Geometria molecular',
                'subtitle' => 'Por que as moléculas têm a forma que têm',
                'summary' => 'Visualização tridimensional de moléculas com controle de ângulos de ligação, pares isolados e comparação entre geometrias previstas e observadas.',
                'kind' => ModuleKind::Visualization,
                'status' => ModuleStatus::Draft,
                'difficulty' => DifficultyLevel::Intermediate,
                'componentKey' => 'molecule-viewer',
                'minutes' => 15,
                'tags' => ['Moléculas', 'Estrutura', '3D'],
                'spec' => ['version' => '0.1.0', 'parameters' => [], 'outputs' => []],
                'sections' => [],
            ],
        ];
    }

    /**
     * Contrato de um módulo de simulação.
     *
     * O núcleo lê `parameters`, `presets` e `outputs` para montar o painel de
     * controle e os mostradores **sem saber nada de órbitas**. O componente do
     * módulo cuida apenas da física e do desenho.
     *
     * @return array<string, mixed>
     */
    private static function orbitalSandboxSpec(): array
    {
        return [
            'version' => '1.0.0',
            'modelVersion' => '1.0.0',
            'view' => [
                'renderer' => 'canvas',
                'aspectRatio' => '4/3',
            ],
            'parameters' => [
                [
                    'key' => 'centralMass',
                    'label' => 'Massa do corpo central',
                    'unit' => 'M⊕',
                    'type' => 'number',
                    'min' => 0.2,
                    'max' => 10,
                    'step' => 0.1,
                    'default' => 1,
                    'description' => 'Em massas terrestres. Define a intensidade do campo gravitacional.',
                ],
                [
                    'key' => 'altitude',
                    'label' => 'Altitude inicial',
                    'unit' => 'km',
                    'type' => 'number',
                    'min' => 200,
                    'max' => 40000,
                    'step' => 100,
                    'default' => 400,
                    'description' => 'Distância acima da superfície do corpo central no instante inicial.',
                ],
                [
                    'key' => 'speedFactor',
                    'label' => 'Velocidade inicial',
                    'unit' => '× circular',
                    'type' => 'number',
                    'min' => 0.4,
                    'max' => 1.5,
                    'step' => 0.01,
                    'default' => 1,
                    'description' => 'Múltiplo da velocidade que manteria órbita circular nesta altitude. Acima de 1,414 a trajetória escapa.',
                ],
                [
                    'key' => 'flightAngle',
                    'label' => 'Ângulo de trajetória',
                    'unit' => '°',
                    'type' => 'number',
                    'min' => -45,
                    'max' => 45,
                    'step' => 1,
                    'default' => 0,
                    'description' => 'Inclinação da velocidade em relação ao horizonte local. Zero significa velocidade puramente tangencial.',
                ],
            ],
            'presets' => [
                [
                    'key' => 'leo',
                    'label' => 'Órbita baixa',
                    'values' => ['centralMass' => 1, 'altitude' => 400, 'speedFactor' => 1, 'flightAngle' => 0],
                ],
                [
                    'key' => 'transferencia',
                    'label' => 'Órbita de transferência',
                    'values' => ['centralMass' => 1, 'altitude' => 400, 'speedFactor' => 1.28, 'flightAngle' => 0],
                ],
                [
                    'key' => 'escape',
                    'label' => 'Trajetória de escape',
                    'values' => ['centralMass' => 1, 'altitude' => 400, 'speedFactor' => 1.42, 'flightAngle' => 0],
                ],
                [
                    'key' => 'suborbital',
                    'label' => 'Trajetória suborbital',
                    'values' => ['centralMass' => 1, 'altitude' => 400, 'speedFactor' => 0.72, 'flightAngle' => 0],
                ],
            ],
            'outputs' => [
                ['key' => 'apoapsis', 'label' => 'Apoapsis', 'unit' => 'km', 'precision' => 0],
                ['key' => 'periapsis', 'label' => 'Periapsis', 'unit' => 'km', 'precision' => 0],
                ['key' => 'eccentricity', 'label' => 'Excentricidade', 'unit' => '', 'precision' => 3],
                ['key' => 'period', 'label' => 'Período orbital', 'unit' => 'min', 'precision' => 1],
                ['key' => 'specificEnergy', 'label' => 'Energia específica', 'unit' => 'MJ/kg', 'precision' => 2],
            ],
            'charts' => [
                [
                    'key' => 'altitude',
                    'label' => 'Altitude no tempo',
                    'xLabel' => 'Tempo (min)',
                    'yLabel' => 'Altitude (km)',
                ],
                [
                    'key' => 'speed',
                    'label' => 'Velocidade no tempo',
                    'xLabel' => 'Tempo (min)',
                    'yLabel' => 'Velocidade (km/s)',
                ],
            ],
        ];
    }

    /**
     * Módulo de exploração: em vez de variáveis, o `spec` descreve pontos
     * de interesse. Mesma coluna, semântica diferente — é exatamente o que a
     * escolha por JSONB (ADR 0006) compra.
     *
     * @return array<string, mixed>
     */
    private static function rocketAnatomySpec(): array
    {
        return [
            'version' => '0.1.0',
            'view' => ['renderer' => 'svg', 'aspectRatio' => '3/4'],
            'hotspots' => [
                ['key' => 'nose-cone', 'label' => 'Coifa'],
                ['key' => 'payload', 'label' => 'Carga útil'],
                ['key' => 'oxidizer-tank', 'label' => 'Tanque de oxidante'],
                ['key' => 'fuel-tank', 'label' => 'Tanque de combustível'],
                ['key' => 'pressurization', 'label' => 'Sistema de pressurização'],
                ['key' => 'turbopump', 'label' => 'Turbobomba'],
                ['key' => 'combustion-chamber', 'label' => 'Câmara de combustão'],
                ['key' => 'regenerative-cooling', 'label' => 'Refrigeração regenerativa'],
                ['key' => 'nozzle', 'label' => 'Tubeira'],
                ['key' => 'gimbal', 'label' => 'Atuadores de vetorização'],
                ['key' => 'avionics', 'label' => 'Aviônica e sensores'],
                ['key' => 'structure', 'label' => 'Estrutura e interestágio'],
            ],
        ];
    }
}
