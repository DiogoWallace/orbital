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
                'status' => ModuleStatus::Published,
                'difficulty' => DifficultyLevel::Intermediate,
                'componentKey' => 'rocket-anatomy',
                'minutes' => 20,
                'publishedDaysAgo' => 0,
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
                'status' => ModuleStatus::Published,
                'difficulty' => DifficultyLevel::Advanced,
                'componentKey' => 'transit-explorer',
                'minutes' => 25,
                'publishedDaysAgo' => 0,
                'tags' => ['Exoplanetas', 'Séries temporais', 'Fotometria'],
                'spec' => self::transitExplorerSpec(),
                'sections' => [
                    [
                        'kind' => SectionKind::Text,
                        'title' => 'O que é um trânsito',
                        'body' => "Quando um planeta passa na frente da própria estrela, ele bloqueia uma fração pequena da luz que chega até nós. A queda é minúscula — para um planeta do tamanho de Júpiter diante de uma estrela como o Sol, cerca de um por cento; para um planeta do tamanho da Terra, algo perto de um centésimo disso.\n\nNão se vê o planeta. Vê-se a estrela ficar um pouco mais fraca, na mesma medida, no mesmo intervalo, repetidas vezes. É a repetição que sustenta a afirmação: uma queda isolada é um acidente qualquer; uma queda que volta com período constante é um corpo em órbita.",
                    ],
                    [
                        'kind' => SectionKind::Text,
                        'title' => 'Por que achatar a curva antes',
                        'body' => "A estrela não fica parada. Manchas na superfície, rotação e pulsação produzem uma ondulação lenta que costuma ser muito maior que o trânsito procurado. O método de busca assume uma linha de base plana, então, sem achatar, ele encontra a ondulação antes de encontrar o planeta.\n\nA janela do achatamento é o compromisso central deste módulo. Curta demais, ela acompanha o próprio trânsito e o remove junto com a variabilidade. Longa demais, deixa a ondulação passar. Vale experimentar os dois extremos no alvo raso e ver o sinal aparecer e sumir.",
                    ],
                    [
                        'kind' => SectionKind::Formula,
                        'title' => 'Profundidade e tamanho do planeta',
                        'body' => '\\frac{\\Delta F}{F} \\approx \\left(\\frac{R_p}{R_\\star}\\right)^2',
                        'meta' => ['caption' => 'A fração de luz bloqueada é aproximadamente a razão entre as áreas — por isso a profundidade mede o raio do planeta em unidades do raio da estrela, e não a massa dele.'],
                    ],
                    [
                        'kind' => SectionKind::Callout,
                        'title' => 'Encontrar um sinal não é encontrar um planeta',
                        'body' => 'Uma binária eclipsante, uma estrela vizinha contaminando a mesma abertura ou um artefato do instrumento produzem quedas periódicas convincentes. Confirmar um planeta exige descartar cada uma dessas hipóteses e, depois, observação independente. O que este módulo faz é o primeiro passo de uma cadeia longa.',
                        'meta' => ['tone' => 'warning'],
                    ],
                ],
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
     * Módulo de análise: os parâmetros são do **método**, não do fenômeno.
     *
     * Repare no que não está aqui: o alvo. Qual dado se analisa e como se
     * analisa são elos diferentes da cadeia de reprodutibilidade (ADR 0014), e
     * misturá-los no mesmo painel embaralharia os dois. O alvo é escolhido em
     * um seletor próprio, que vira a lista de `datasets` quando houver dado
     * real.
     *
     * @return array<string, mixed>
     */
    private static function transitExplorerSpec(): array
    {
        return [
            'version' => '1.0.0',
            'modelVersion' => '1.0.0',
            'view' => ['renderer' => 'none', 'aspectRatio' => '16/9'],
            'parameters' => [
                [
                    'key' => 'detrendWindowDays',
                    'label' => 'Janela de achatamento',
                    'unit' => 'd',
                    'type' => 'number',
                    'min' => 0.1,
                    'max' => 2,
                    'step' => 0.05,
                    'default' => 0.5,
                    'description' => 'Largura da mediana móvel. Curta demais engole o próprio trânsito; longa demais deixa a variabilidade passar.',
                ],
                [
                    'key' => 'minPeriod',
                    'label' => 'Menor período testado',
                    'unit' => 'd',
                    'type' => 'number',
                    'min' => 0.3,
                    'max' => 3,
                    'step' => 0.1,
                    'default' => 0.5,
                    'description' => 'Piso da busca. Abaixo de meio dia a curva raramente tem pontos suficientes por trânsito.',
                ],
                [
                    'key' => 'maxPeriod',
                    'label' => 'Maior período testado',
                    'unit' => 'd',
                    'type' => 'number',
                    'min' => 4,
                    'max' => 20,
                    'step' => 0.5,
                    'default' => 12,
                    'description' => 'Teto da busca. Acima de um terço da janela observada, poucos trânsitos cabem na série e a detecção deixa de ser confiável.',
                ],
                [
                    'key' => 'periodCount',
                    'label' => 'Períodos na grade',
                    'unit' => '',
                    'type' => 'number',
                    'min' => 500,
                    'max' => 3000,
                    'step' => 100,
                    'default' => 1500,
                    'description' => 'Resolução da busca. Grade rala pode passar ao lado do período verdadeiro; grade fina custa tempo.',
                ],
                [
                    'key' => 'bins',
                    'label' => 'Divisões de fase',
                    'unit' => '',
                    'type' => 'number',
                    'min' => 60,
                    'max' => 300,
                    'step' => 10,
                    'default' => 160,
                    'description' => 'Em quantas fatias a fase é dividida. Define a menor duração de trânsito que a caixa consegue descrever.',
                ],
                [
                    'key' => 'maxDuty',
                    'label' => 'Maior fração em trânsito',
                    'unit' => '',
                    'type' => 'number',
                    'min' => 0.02,
                    'max' => 0.3,
                    'step' => 0.01,
                    'default' => 0.12,
                    'description' => 'Teto da largura da caixa. Um trânsito planetário ocupa uma fatia pequena do período; permitir muito abre espaço para falso positivo.',
                ],
            ],
            'presets' => [
                [
                    'key' => 'busca-padrao',
                    'label' => 'Busca padrão',
                    'values' => [
                        'detrendWindowDays' => 0.5,
                        'minPeriod' => 0.5,
                        'maxPeriod' => 12,
                        'periodCount' => 1500,
                        'bins' => 160,
                        'maxDuty' => 0.12,
                    ],
                ],
                [
                    'key' => 'periodos-curtos',
                    'label' => 'Períodos curtos, grade fina',
                    'values' => [
                        'detrendWindowDays' => 0.4,
                        'minPeriod' => 0.3,
                        'maxPeriod' => 5,
                        'periodCount' => 2500,
                        'bins' => 220,
                        'maxDuty' => 0.1,
                    ],
                ],
                [
                    'key' => 'achatamento-agressivo',
                    'label' => 'Achatamento agressivo',
                    'values' => [
                        'detrendWindowDays' => 0.15,
                        'minPeriod' => 0.5,
                        'maxPeriod' => 12,
                        'periodCount' => 1500,
                        'bins' => 160,
                        'maxDuty' => 0.12,
                    ],
                ],
                [
                    'key' => 'achatamento-suave',
                    'label' => 'Achatamento suave',
                    'values' => [
                        'detrendWindowDays' => 1.6,
                        'minPeriod' => 0.5,
                        'maxPeriod' => 12,
                        'periodCount' => 1500,
                        'bins' => 160,
                        'maxDuty' => 0.12,
                    ],
                ],
            ],
            'outputs' => [
                ['key' => 'period', 'label' => 'Período', 'unit' => 'd', 'precision' => 4],
                ['key' => 'depthPercent', 'label' => 'Profundidade', 'unit' => '%', 'precision' => 3],
                ['key' => 'durationHours', 'label' => 'Duração', 'unit' => 'h', 'precision' => 2],
                ['key' => 'snr', 'label' => 'Relação sinal/ruído', 'unit' => '', 'precision' => 1],
                ['key' => 'power', 'label' => 'Altura do pico', 'unit' => '×10⁻³', 'precision' => 2],
            ],
            'charts' => [
                [
                    'key' => 'raw',
                    'label' => 'Curva de luz',
                    'xLabel' => 'Tempo (dias)',
                    'yLabel' => 'Fluxo relativo',
                ],
                [
                    'key' => 'detrended',
                    'label' => 'Curva achatada',
                    'xLabel' => 'Tempo (dias)',
                    'yLabel' => 'Fluxo relativo',
                ],
                [
                    'key' => 'periodogram',
                    'label' => 'Periodograma',
                    'xLabel' => 'Período (dias)',
                    'yLabel' => 'Signal residue',
                ],
                [
                    'key' => 'folded',
                    'label' => 'Curva dobrada em fase',
                    'xLabel' => 'Fase',
                    'yLabel' => 'Fluxo relativo',
                ],
            ],

            // O que cada série observacional ensina, e o valor publicado contra
            // o qual comparar. Chave desconhecida para o núcleo (ADR 0006), lida
            // pelo próprio módulo.
            //
            // A lição é conteúdo do módulo, não do dataset: a mesma curva
            // ensinaria outra coisa num módulo de variabilidade estelar. O
            // dataset guarda procedência; o significado mora aqui.
            //
            // `published` vem da tabela TOI do NASA Exoplanet Archive, consultada
            // em 31/08/2026. Nenhum número aqui foi estimado.
            'datasets' => self::transitDatasetNotes(),
        ];
    }

    /**
     * Notas editoriais das cinco séries reais.
     *
     * Os valores recuperados citados nos textos foram medidos com os parâmetros
     * padrão do módulo. Mudar a janela de achatamento muda os números — o que é
     * parte da lição, não defeito dela.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function transitDatasetNotes(): array
    {
        return [
            [
                'slug' => 'tess-tic256364928-s54',
                'label' => 'HD 189733 b',
                'brief' => 'Júpiter quente, um dos exoplanetas mais estudados que existem. O trânsito é fundo e repetido: o caso em que o método acha sem esforço.',
                'lesson' => "Período recuperado com erro abaixo de 0,05% do publicado, e relação sinal/ruído nas centenas. É a referência de como um achado inequívoco se parece.\n\nRepare que a profundidade medida sai **abaixo** da publicada. Não é erro: a caixa do BLS é mais larga que o trânsito real e engole a entrada e a saída, onde o brilho ainda não caiu tudo. O método mede um retângulo; o céu não faz retângulos.",
                'published' => ['period' => 2.2186, 'depthPercent' => 2.585, 'durationHours' => 1.82],
            ],
            [
                'slug' => 'tess-tic261136679-s01',
                'label' => 'π Mensae c',
                'brief' => 'Super-Terra confirmada, e este é o setor 1 — o primeiro que o TESS observou, e o dado em que ela foi descoberta.',
                'lesson' => "O caso mais importante dos cinco, e o mais desconfortável. O período volta certo, com erro de 0,3% — mas o pico do periodograma é o **menor de todas as cinco séries**, incluindo a estrela sem nada catalogado e a pulsante.\n\nOu seja: se você ordenar os alvos por altura de pico ou por relação sinal/ruído, o único planeta pequeno de verdade fica em último. Nenhum número sozinho o distingue. O que o distingue é a curva dobrada: uma queda curta, de fundo plano, que se repete na mesma fase. Olhe o gráfico, não o ranking.",
                'published' => ['period' => 6.2678, 'depthPercent' => 0.032, 'durationHours' => 2.79],
            ],
            [
                'slug' => 'tess-tic285524410-s61',
                'label' => 'TOI 2848.01 — binária eclipsante',
                'brief' => 'Classificada como falso positivo. As quedas são periódicas, fundas e convincentes — e não são planeta.',
                'lesson' => "O pico mais alto das cinco séries, com folga: cerca de dez vezes o do Júpiter quente e mais de mil vezes o da super-Terra. E é o alvo que **não** tem planeta.\n\nProfundidade dessa ordem exigiria um companheiro do tamanho de uma estrela. Dobre a curva e procure a fase 0,5: é ali que a companheira passa por trás da principal, num mergulho mais raso, e é essa assinatura que denuncia a binária. O BLS acertou o período e não tem opinião sobre o que ele significa.",
                'published' => ['period' => 3.0244, 'depthPercent' => 26.702, 'durationHours' => 5.37],
            ],
            [
                'slug' => 'tess-tic7697330-s04',
                'label' => 'HD 28014 — estrela pulsante',
                'brief' => 'Variável do tipo gamma Doradus. Não há planeta aqui: a estrela pulsa sozinha, com período dentro da faixa que a busca varre.',
                'lesson' => "Periodicidade real, trânsito nenhum — e o pico resultante é dezenas de vezes maior que o da super-Terra confirmada.\n\nA variação é suave e ocupa o ciclo inteiro, em vez de uma queda curta num pedaço dele. É isso que a curva dobrada mostra e o periodograma esconde. Vale encurtar a janela de achatamento e ver o pico ceder: o parâmetro do método muda a conclusão, e saber disso é metade do trabalho.",
                'published' => null,
            ],
            [
                'slug' => 'tess-tic270950967-s14',
                'label' => 'HD 185415 — sem nada catalogado',
                'brief' => 'Nenhum objeto de interesse registrado para esta estrela, e nenhum tipo variável atribuído a ela. O que não é o mesmo que uma linha reta.',
                'lesson' => "Esta série entrou no módulo como o caso de controle — a curva onde não deveria haver nada. E não é o que o dado mostra: a busca devolve estrutura, com pico acima do da super-Terra confirmada.\n\nProvavelmente é resíduo do instrumento sobrevivendo ao achatamento, num período longo demais para caber bem no setor. Provavelmente. Não foi verificado, e é por isso que a lição mudou em vez de o alvo ser trocado.\n\nA conclusão útil é essa: **não existe curva vazia**. Ausência de catalogação é ausência de catalogação, não ausência de sinal. Um método que precise de uma linha reta como referência não tem referência nenhuma no céu real — o que se compara é a forma do que aparece, e não a altura de um número.",
                'published' => null,
            ],
        ];
    }

    /**
     * Módulo de exploração: em vez de variáveis, o `spec` descreve pontos
     * de interesse. Mesma coluna, semântica diferente — é exatamente o que a
     * escolha por JSONB (ADR 0006) compra.
     *
     * Cada ponto carrega uma **pergunta** antes da explicação. É a forma da
     * narrativa científica: o texto responde a algo que a pessoa poderia ter
     * perguntado sozinha, em vez de descrever a peça para quem já sabe o que
     * ela faz. A pergunta é conteúdo editorial, e por isso mora aqui, no
     * `spec` — trocar a redação não recompila nada.
     *
     * A **geometria não está aqui**. Onde cada peça é desenhada vive em
     * `modules/rocket-anatomy/data/geometry.ts`, ligada por esta mesma `key`.
     * Coordenada de desenho é assunto do componente: assim a redação muda sem
     * tocar em código, e o desenho muda sem migration nem seed.
     *
     * @return array<string, mixed>
     */
    private static function rocketAnatomySpec(): array
    {
        return [
            'version' => '2.0.0',
            'modelVersion' => '1.0.0',
            'view' => ['renderer' => 'svg', 'aspectRatio' => '3/4'],

            // O mesmo módulo é anatomia **e** simulação: `hotspots` ao lado de
            // `parameters`. O núcleo lê os segundos e ignora os primeiros, sem
            // precisar saber que os dois convivem.
            'parameters' => [
                [
                    'key' => 'throatArea',
                    'label' => 'Área da garganta',
                    'unit' => 'cm²',
                    'type' => 'number',
                    'min' => 200,
                    'max' => 2000,
                    'step' => 50,
                    'default' => 1000,
                    'description' => 'Quanto gás passa por segundo. É o número que decide se o veículo sai do chão.',
                ],
                [
                    'key' => 'chamberPressure',
                    'label' => 'Pressão da câmara',
                    'unit' => 'bar',
                    'type' => 'number',
                    'min' => 30,
                    'max' => 300,
                    'step' => 5,
                    'default' => 100,
                    'description' => 'Pressão da combustão. Mais pressão permite mais expansão, e expansão é o que vira velocidade.',
                ],
                [
                    'key' => 'expansionRatio',
                    'label' => 'Razão de expansão',
                    'unit' => '×',
                    'type' => 'number',
                    'min' => 5,
                    'max' => 80,
                    'step' => 1,
                    'default' => 16,
                    'description' => 'Área de saída sobre área da garganta. Grande demais para o nível do mar, o sino sobre-expande e perde empuxo.',
                ],
                [
                    'key' => 'propellantMass',
                    'label' => 'Massa de propelente',
                    'unit' => 't',
                    'type' => 'number',
                    'min' => 20,
                    'max' => 500,
                    'step' => 5,
                    'default' => 120,
                    'description' => 'Quanto há para queimar. Define o tempo de queima, não o empuxo.',
                ],
                [
                    'key' => 'dryMass',
                    'label' => 'Massa seca',
                    'unit' => 't',
                    'type' => 'number',
                    'min' => 5,
                    'max' => 60,
                    'step' => 1,
                    'default' => 12,
                    'description' => 'Estrutura, motor e carga útil — tudo que continua subindo depois que o propelente acaba.',
                ],
                [
                    'key' => 'throttle',
                    'label' => 'Acelerador',
                    'unit' => '%',
                    'type' => 'number',
                    'min' => 40,
                    'max' => 100,
                    'step' => 1,
                    'default' => 100,
                    'description' => 'Fração da pressão de câmara. Acelerar menos poupa propelente e custa eficiência.',
                ],
            ],
            'presets' => [
                [
                    'key' => 'primeiro-estagio',
                    'label' => 'Primeiro estágio',
                    'values' => [
                        'throatArea' => 1000,
                        'chamberPressure' => 100,
                        'expansionRatio' => 16,
                        'propellantMass' => 120,
                        'dryMass' => 12,
                        'throttle' => 100,
                    ],
                ],
                [
                    'key' => 'tubeira-de-vacuo',
                    'label' => 'Tubeira de vácuo ao nível do mar',
                    'values' => [
                        'throatArea' => 1000,
                        'chamberPressure' => 100,
                        'expansionRatio' => 65,
                        'propellantMass' => 120,
                        'dryMass' => 12,
                        'throttle' => 100,
                    ],
                ],
                [
                    'key' => 'camara-alta',
                    'label' => 'Câmara de alta pressão',
                    'values' => [
                        'throatArea' => 600,
                        'chamberPressure' => 250,
                        'expansionRatio' => 22,
                        'propellantMass' => 120,
                        'dryMass' => 12,
                        'throttle' => 100,
                    ],
                ],
                [
                    'key' => 'acelerador-parcial',
                    'label' => 'Acelerador a 60%',
                    'values' => [
                        'throatArea' => 1400,
                        'chamberPressure' => 100,
                        'expansionRatio' => 16,
                        'propellantMass' => 120,
                        'dryMass' => 12,
                        'throttle' => 60,
                    ],
                ],
            ],
            'outputs' => [
                ['key' => 'altitude', 'label' => 'Altitude', 'unit' => 'km', 'precision' => 1],
                ['key' => 'velocity', 'label' => 'Velocidade', 'unit' => 'km/s', 'precision' => 2],
                ['key' => 'acceleration', 'label' => 'Aceleração', 'unit' => 'g', 'precision' => 2],
                ['key' => 'thrust', 'label' => 'Empuxo', 'unit' => 'kN', 'precision' => 0],
                ['key' => 'mass', 'label' => 'Massa total', 'unit' => 't', 'precision' => 1],
                ['key' => 'dynamicPressure', 'label' => 'Pressão dinâmica', 'unit' => 'kPa', 'precision' => 1],
                ['key' => 'isp', 'label' => 'Impulso específico', 'unit' => 's', 'precision' => 0],
                ['key' => 'exitTemperature', 'label' => 'Temperatura de saída', 'unit' => 'K', 'precision' => 0],
            ],
            'charts' => [
                [
                    'key' => 'altitude',
                    'label' => 'Altitude no tempo',
                    'xLabel' => 'Tempo (s)',
                    'yLabel' => 'Altitude (km)',
                ],
                [
                    'key' => 'velocity',
                    'label' => 'Velocidade no tempo',
                    'xLabel' => 'Tempo (s)',
                    'yLabel' => 'Velocidade (km/s)',
                ],
                [
                    'key' => 'dynamicPressure',
                    'label' => 'Pressão dinâmica no tempo',
                    'xLabel' => 'Tempo (s)',
                    'yLabel' => 'q (kPa)',
                ],
            ],
            'hotspots' => [
                [
                    'key' => 'nose-cone',
                    'label' => 'Coifa',
                    'question' => 'Por que a ponta é afilada, se o foguete passa a maior parte do voo fora do ar?',
                    'body' => "A coifa protege a carga útil justamente na fase em que ainda há ar: as primeiras dezenas de quilômetros, onde a pressão dinâmica e o aquecimento são maiores. A forma existe para atravessar essa parte com o menor arrasto possível.\n\nDepois disso ela deixa de servir para alguma coisa, e é solta. Continuar carregando a coifa até a órbita seria transportar massa que não faz nada — e massa que não faz nada sai da carga útil.",
                ],
                [
                    'key' => 'payload',
                    'label' => 'Carga útil',
                    'question' => 'De tudo que sobe, quanto é a razão de o foguete existir?',
                    'body' => "A carga útil é a única parte que não é meio: satélite, sonda, tripulação. Todo o resto existe para levá-la até uma velocidade e uma altitude específicas.\n\nA fração da massa de decolagem que chega ao destino é pequena — poucos por cento. Isso não é falha de engenharia: é a consequência direta da equação do foguete, em que a massa cresce exponencialmente com a variação de velocidade desejada.",
                ],
                [
                    'key' => 'oxidizer-tank',
                    'label' => 'Tanque de oxidante',
                    'question' => 'Por que levar oxigênio, se ele é abundante na atmosfera?',
                    'body' => "Porque acima da atmosfera não há nenhum. Um motor de avião respira o ar que atravessa; um foguete precisa funcionar onde não existe ar, então carrega o oxidante junto.\n\nEsse é o tanque maior em massa na maioria dos veículos: queimar exige bem mais oxidante do que combustível, e a proporção entre os dois é uma escolha de projeto, não um acaso.",
                ],
                [
                    'key' => 'fuel-tank',
                    'label' => 'Tanque de combustível',
                    'question' => 'Por que dois tanques separados, e não a mistura pronta?',
                    'body' => "Misturar combustível e oxidante antes da câmara não produz um motor: produz um explosivo. A separação é o que permite controlar onde e em que proporção a reação acontece.\n\nEla também deixa o combustível fazer outro trabalho antes de queimar. Em boa parte dos motores, ele passa pelas paredes da câmara como refrigerante — e chega à combustão já pré-aquecido.",
                ],
                [
                    'key' => 'pressurization',
                    'label' => 'Sistema de pressurização',
                    'question' => 'O que impede o tanque de amassar enquanto esvazia?',
                    'body' => "À medida que o propelente sai, o volume que ele ocupava precisa ser preenchido por gás sob pressão. Sem isso o tanque colapsaria sobre o próprio vazio.\n\nA pressão tem uma segunda função, menos óbvia: manter a entrada da bomba sempre acima da pressão de vapor do líquido. Abaixo dela o propelente ferve dentro da tubulação e a bomba passa a girar em bolha — cavitação, que destrói a máquina em segundos.",
                ],
                [
                    'key' => 'turbopump',
                    'label' => 'Turbobomba',
                    'question' => 'Como empurrar propelente para dentro de uma câmara que está a uma pressão maior que a do tanque?',
                    'body' => "Com uma bomba. A turbobomba eleva a pressão do propelente acima da pressão da câmara, e é acionada por uma turbina movida por uma fração do próprio propelente.\n\nÉ ela que permite os tanques serem leves. Sem bomba, o tanque teria de sustentar sozinho a pressão da câmara, e a espessura de parede necessária para isso acabaria com o orçamento de massa do veículo.",
                ],
                [
                    'key' => 'combustion-chamber',
                    'label' => 'Câmara de combustão',
                    'question' => 'Por que a pressão dentro da câmara importa tanto?',
                    'body' => "É aqui que energia química vira energia térmica: os propelentes se encontram, reagem e produzem gás muito quente e muito comprimido.\n\nA pressão da câmara é o que define quanto desse calor a tubeira vai conseguir converter em velocidade. Pressão maior permite uma expansão maior, e expansão maior significa mais empuxo pela mesma área de garganta — que é a razão de a engenharia de motores girar tanto em torno desse número.",
                ],
                [
                    'key' => 'regenerative-cooling',
                    'label' => 'Refrigeração regenerativa',
                    'question' => 'Como a parede sobrevive a um gás mais quente que o ponto de fusão do metal dela?',
                    'body' => "Ela não sobreviveria parada. O combustível circula por canais dentro da própria parede antes de ser queimado, e leva o calor embora continuamente.\n\nO nome “regenerativa” vem do que acontece com esse calor: ele não é jogado fora. O combustível chega à câmara pré-aquecido, e a energia que ele retirou da parede volta para dentro do ciclo. O refrigerante é o próprio combustível.",
                ],
                [
                    'key' => 'nozzle',
                    'label' => 'Tubeira',
                    'question' => 'Por que o formato de sino? O empuxo não vem de queimar?',
                    'body' => "Queimar produz gás quente e comprimido, que sozinho empurra em todas as direções. O empuxo aparece quando esse gás é obrigado a sair por um caminho só, e rápido.\n\nA tubeira converge até a garganta, onde o escoamento atinge a velocidade do som, e volta a se abrir para acelerá-lo além dela. A razão de expansão é escolhida para a altitude em que o motor trabalha — e é por isso que motor de primeiro estágio e motor de vácuo têm sinos de tamanhos tão diferentes.",
                ],
                [
                    'key' => 'gimbal',
                    'label' => 'Atuadores de vetorização',
                    'question' => 'Sem ar, como se corrige a direção?',
                    'body' => "Superfícies de controle precisam de ar para funcionar, e ele acaba cedo. O que sobra é inclinar o próprio motor.\n\nQuando o empuxo deixa de apontar para o centro de massa, aparece um torque, e o veículo gira. Bastam alguns graus de inclinação: os atuadores movem o motor inteiro, e o foguete é pilotado pela direção da sua própria exaustão.",
                ],
                [
                    'key' => 'avionics',
                    'label' => 'Aviônica e sensores',
                    'question' => 'Quem decide, a cada instante, para onde apontar?',
                    'body' => "Sensores inerciais medem atitude e aceleração muitas vezes por segundo. O computador compara o que está acontecendo com a trajetória planejada e comanda a correção.\n\nNada disso é pilotado à mão. A malha — medir, comparar, corrigir — fecha rápido demais para reação humana, e é ela que transforma um tubo cheio de propelente em um veículo dirigível.",
                ],
                [
                    'key' => 'structure',
                    'label' => 'Estrutura e interestágio',
                    'question' => 'O que segura tudo isso enquanto o conjunto acelera?',
                    'body' => "A estrutura enfrenta dois momentos difíceis: a região de máxima pressão dinâmica, ainda na atmosfera, e o pico de aceleração perto do fim da queima, quando o veículo já está leve e o empuxo continua alto.\n\nO interestágio é a peça que une dois estágios e abriga o mecanismo de separação. Aqui cada quilograma economizado vira carga útil, e cada quilograma a mais sai dela — o que faz da estrutura um exercício permanente de tirar material sem perder margem.",
                ],
            ],
        ];
    }
}
