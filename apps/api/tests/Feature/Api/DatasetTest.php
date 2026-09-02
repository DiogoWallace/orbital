<?php

declare(strict_types=1);

use App\Domain\Datasets\Actions\IngestLightCurve;
use App\Domain\Datasets\Data\LightCurveData;
use App\Domain\Datasets\Enums\Mission;
use App\Domain\Datasets\Models\Dataset;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Carbon\CarbonImmutable;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Construtor, e não `LightCurveData::from()`.
 *
 * O `from()` do spatie não popula propriedades `array` simples — `time` e
 * `flux` voltariam vazios em silêncio, e os testes que esperam exceção
 * passariam pelo motivo errado. Aconteceu na primeira versão deste arquivo.
 */
function curvaDeTeste(array $sobrescreve = []): LightCurveData
{
    $padrao = [
        'mission' => Mission::Tess,
        'instrument' => 'TESS Photometer',
        'target' => 'TIC 256364928',
        'time' => [0.0, 0.01, 0.02, 0.03],
        'flux' => [1.0, 0.999, 1.001, 1.0],
        'retrievedAt' => CarbonImmutable::parse('2026-08-31T12:00:00Z'),
        'sourceArchive' => 'MAST',
        'pipeline' => 'SPOC',
        'product' => 'PDCSAP_FLUX',
        'externalId' => '256364928',
        'sector' => 54,
        'cadenceSeconds' => 120,
        'sourceFile' => null,
        'sha256' => str_repeat('a', 64),
        'citation' => 'Citação de teste.',
    ];

    $v = array_merge($padrao, $sobrescreve);

    return new LightCurveData(
        mission: $v['mission'],
        instrument: $v['instrument'],
        target: $v['target'],
        time: $v['time'],
        flux: $v['flux'],
        retrievedAt: $v['retrievedAt'],
        sourceArchive: $v['sourceArchive'],
        pipeline: $v['pipeline'],
        product: $v['product'],
        externalId: $v['externalId'],
        sector: $v['sector'],
        cadenceSeconds: $v['cadenceSeconds'],
        sourceFile: $v['sourceFile'],
        sha256: $v['sha256'],
        citation: $v['citation'],
    );
}

describe('ingestão', function () {
    it('grava a curva e deriva o que dá para derivar', function () {
        $dataset = app(IngestLightCurve::class)->execute(curvaDeTeste());

        expect($dataset->slug)->toBe('tess-tic256364928-s54')
            ->and($dataset->points)->toBe(4)
            ->and($dataset->time_span_days)->toBe(0.03)
            ->and($dataset->series->flux)->toHaveCount(4)
            ->and($dataset->published_at)->toBeNull();
    });

    it('é idempotente pelo slug', function () {
        $acao = app(IngestLightCurve::class);

        $acao->execute(curvaDeTeste());
        $acao->execute(curvaDeTeste(['citation' => 'Citação corrigida.']));

        expect(Dataset::count())->toBe(1)
            ->and(Dataset::first()->citation)->toBe('Citação corrigida.');
    });

    it('recusa vetores de tamanhos diferentes', function () {
        expect(fn () => app(IngestLightCurve::class)->execute(
            curvaDeTeste(['flux' => [1.0, 1.0]]),
        ))->toThrow(InvalidArgumentException::class);
    });

    it('recusa curva vazia', function () {
        expect(fn () => app(IngestLightCurve::class)->execute(
            curvaDeTeste(['time' => [], 'flux' => []]),
        ))->toThrow(InvalidArgumentException::class);
    });

    it('trata o marcador PREENCHER como ausência de citação', function () {
        $curva = LightCurveData::fromArchiveJson([
            'procedencia' => [
                'missao' => 'TESS',
                'instrumento' => 'TESS Photometer',
                'alvo' => 'TIC 1',
                'obtidoEm' => '2026-08-31T12:00:00Z',
                'arquivo' => 'MAST',
                'citacao' => 'PREENCHER: ver termos de reconhecimento do MAST/TESS',
            ],
            'tempo' => [0.0, 0.01],
            'fluxo' => [1.0, 1.0],
        ]);

        // Exibir a palavra PREENCHER como se fosse a fonte seria pior do que
        // admitir que a citação falta.
        expect($curva->citation)->toBeNull();
    });

    it('marca como não citável o que não tem soma nem citação', function () {
        $dataset = app(IngestLightCurve::class)->execute(
            curvaDeTeste(['sha256' => null, 'citation' => null]),
        );

        expect($dataset->isCitable())->toBeFalse();
    });
});

describe('leitura pública', function () {
    it('lista apenas o que está publicado', function () {
        Dataset::factory()->create(['slug' => 'publicado']);
        Dataset::factory()->draft()->create(['slug' => 'rascunho']);

        $resposta = $this->getJson('/api/v1/datasets');

        $resposta->assertOk();
        expect(collect($resposta->json('data'))->pluck('slug')->all())->toBe(['publicado']);
    });

    it('esconde rascunho com 404, não com 403', function () {
        Dataset::factory()->draft()->create(['slug' => 'rascunho']);

        // 403 confirmaria que o dataset existe.
        $this->getJson('/api/v1/datasets/rascunho')->assertNotFound();
    });

    it('deixa a curadoria enxergar o rascunho', function () {
        Dataset::factory()->draft()->create(['slug' => 'rascunho']);

        // Os papéis vêm do seeder, que não roda na suíte: cada teste que
        // precisa de um cria os seus. É a mesma abordagem do ModuleCatalogTest.
        foreach (Role::cases() as $papel) {
            SpatieRole::findOrCreate($papel->value, 'web');
        }

        $curador = User::factory()->create();
        $curador->assignRole(Role::Curator->value);

        // `withToken`, e não `actingAs`: é o caminho do token que a rota
        // pública exercita (ADR 0012).
        $this->withToken($curador->createToken('teste')->plainTextToken)
            ->getJson('/api/v1/datasets/rascunho')
            ->assertOk();
    });

    it('não manda a série na listagem', function () {
        Dataset::factory()->withSeries()->create();

        $resposta = $this->getJson('/api/v1/datasets');

        expect($resposta->json('data.0'))->not->toHaveKey('time')
            ->and($resposta->json('data.0'))->not->toHaveKey('flux');
    });

    it('entrega a procedência inteira no detalhe', function () {
        Dataset::factory()->create(['slug' => 'alvo']);

        $resposta = $this->getJson('/api/v1/datasets/alvo');

        $resposta->assertOk()
            ->assertJsonPath('data.citable', true)
            ->assertJsonPath('data.provenance.mission', 'tess')
            ->assertJsonPath('data.provenance.missionLabel', 'TESS')
            ->assertJsonPath('data.provenance.archive', 'MAST');

        expect($resposta->json('data.provenance.sha256'))->toHaveLength(64)
            ->and($resposta->json('data.provenance.retrievedAt'))->not->toBeNull();
    });

    it('serve os pontos por rota própria, em vetores paralelos', function () {
        Dataset::factory()->withSeries(50)->create(['slug' => 'alvo']);

        $resposta = $this->getJson('/api/v1/datasets/alvo/series');

        $resposta->assertOk()->assertJsonPath('data.points', 50);

        expect($resposta->json('data.time'))->toHaveCount(50)
            ->and($resposta->json('data.flux'))->toHaveCount(50);
    });

    it('responde 404 quando o dataset ainda não tem série', function () {
        Dataset::factory()->create(['slug' => 'sem-serie']);

        $this->getJson('/api/v1/datasets/sem-serie/series')->assertNotFound();
    });

    it('expõe a falta de procedência em vez de escondê-la', function () {
        Dataset::factory()->unciteable()->create(['slug' => 'incompleto']);

        $this->getJson('/api/v1/datasets/incompleto')
            ->assertOk()
            ->assertJsonPath('data.citable', false)
            ->assertJsonPath('data.provenance.citation', null);
    });
});
