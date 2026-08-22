<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalog\Models\Discipline;
use App\Domain\Catalog\Models\Topic;
use Illuminate\Database\Seeder;

/**
 * Taxonomia inicial.
 *
 * A árvore é conteúdo, não estrutura: acrescentar "Biofísica" amanhã é inserir
 * linhas, nunca migrar schema.
 */
class DisciplineSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->tree() as $position => $discipline) {
            $model = Discipline::updateOrCreate(
                ['slug' => $discipline['slug']],
                [
                    'name' => $discipline['name'],
                    'tagline' => $discipline['tagline'],
                    'description' => $discipline['description'],
                    'accent' => $discipline['accent'],
                    'icon' => $discipline['icon'],
                    'position' => $position,
                ],
            );

            foreach ($discipline['topics'] as $topicPosition => $topic) {
                Topic::updateOrCreate(
                    ['discipline_id' => $model->id, 'slug' => $topic['slug']],
                    [
                        'name' => $topic['name'],
                        'description' => $topic['description'] ?? null,
                        'position' => $topicPosition,
                    ],
                );
            }
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function tree(): array
    {
        return [
            [
                'slug' => 'fisica',
                'name' => 'Física',
                'tagline' => 'As leis que governam matéria, energia e movimento.',
                'description' => 'Mecânica, termodinâmica, ondas e relatividade — os princípios que sustentam todas as outras áreas da plataforma.',
                'accent' => 'cyan',
                'icon' => 'atom',
                'topics' => [
                    ['slug' => 'mecanica', 'name' => 'Mecânica', 'description' => 'Movimento, forças, energia e momento.'],
                    ['slug' => 'termodinamica', 'name' => 'Termodinâmica', 'description' => 'Calor, entropia e transformações de energia.'],
                    ['slug' => 'ondas', 'name' => 'Ondas e óptica', 'description' => 'Propagação, interferência e espectro eletromagnético.'],
                    ['slug' => 'relatividade', 'name' => 'Relatividade', 'description' => 'Referenciais, dilatação temporal e gravitação.'],
                ],
            ],
            [
                'slug' => 'astronomia',
                'name' => 'Astronomia',
                'tagline' => 'Do movimento orbital às estruturas em escala galáctica.',
                'description' => 'Mecânica celeste, corpos do sistema solar, missões espaciais e análise de dados observacionais.',
                'accent' => 'violet',
                'icon' => 'orbit',
                'topics' => [
                    ['slug' => 'mecanica-orbital', 'name' => 'Mecânica orbital', 'description' => 'Órbitas, transferências e manobras.'],
                    ['slug' => 'sistema-solar', 'name' => 'Sistema solar', 'description' => 'Planetas, luas, asteroides e cometas.'],
                    ['slug' => 'estrelas-galaxias', 'name' => 'Estrelas e galáxias', 'description' => 'Evolução estelar e estruturas em larga escala.'],
                    ['slug' => 'dados-espaciais', 'name' => 'Dados espaciais', 'description' => 'Séries temporais, catálogos e imagens de missões.'],
                ],
            ],
            [
                'slug' => 'engenharia',
                'name' => 'Engenharia',
                'tagline' => 'Como sistemas complexos são projetados para funcionar.',
                'description' => 'Propulsão, estruturas, controle e os sistemas que transformam princípios físicos em máquinas.',
                'accent' => 'amber',
                'icon' => 'rocket',
                'topics' => [
                    ['slug' => 'foguetes', 'name' => 'Foguetes', 'description' => 'Veículos lançadores e seus subsistemas.'],
                    ['slug' => 'propulsao', 'name' => 'Propulsão', 'description' => 'Motores, ciclos e desempenho.'],
                    ['slug' => 'estruturas', 'name' => 'Estruturas', 'description' => 'Cargas, materiais e integridade estrutural.'],
                    ['slug' => 'controle', 'name' => 'Controle e aviônica', 'description' => 'Sensores, atuadores e malhas de controle.'],
                ],
            ],
            [
                'slug' => 'quimica',
                'name' => 'Química',
                'tagline' => 'Estrutura da matéria e comportamento dos materiais.',
                'description' => 'Estruturas moleculares, propriedades de materiais e reações estudadas por simulação.',
                'accent' => 'emerald',
                'icon' => 'flask',
                'topics' => [
                    ['slug' => 'moleculas', 'name' => 'Moléculas', 'description' => 'Geometria, ligações e orbitais.'],
                    ['slug' => 'materiais', 'name' => 'Materiais', 'description' => 'Propriedades mecânicas, térmicas e elétricas.'],
                    ['slug' => 'reacoes', 'name' => 'Reações', 'description' => 'Cinética, equilíbrio e energia de reação.'],
                ],
            ],
            [
                'slug' => 'dados',
                'name' => 'Análise de dados',
                'tagline' => 'Métodos para extrair sentido de observações.',
                'description' => 'Estatística, séries temporais, ajuste de modelos e visualização científica.',
                'accent' => 'rose',
                'icon' => 'chart',
                'topics' => [
                    ['slug' => 'series-temporais', 'name' => 'Séries temporais', 'description' => 'Tendência, sazonalidade e detecção de eventos.'],
                    ['slug' => 'ajuste-de-modelos', 'name' => 'Ajuste de modelos', 'description' => 'Regressão, incerteza e qualidade do ajuste.'],
                    ['slug' => 'visualizacao', 'name' => 'Visualização', 'description' => 'Representações que preservam a informação do dado.'],
                ],
            ],
        ];
    }
}
