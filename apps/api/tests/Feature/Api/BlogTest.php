<?php

declare(strict_types=1);

use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    foreach (Role::cases() as $role) {
        SpatieRole::findOrCreate($role->value, 'web');
    }
});

it('lista só o que está publicado', function () {
    Post::factory()->published()->create(['title' => 'No ar']);
    Post::factory()->create(['title' => 'Rascunho']);

    $response = $this->getJson('/api/v1/posts')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.title'))->toBe('No ar');
});

it('segura o post agendado até a data chegar', function () {
    Post::factory()->scheduled()->create(['title' => 'Semana que vem']);

    // `published_at` no futuro é a agenda: nenhum processo em background
    // precisa existir para o post aparecer na hora certa.
    expect($this->getJson('/api/v1/posts')->json('data'))->toHaveCount(0);
});

it('devolve o mais recente primeiro', function () {
    Post::factory()->create([
        'title' => 'Antigo',
        'status' => 'published',
        'published_at' => now()->subMonth(),
    ]);
    Post::factory()->create([
        'title' => 'Recente',
        'status' => 'published',
        'published_at' => now()->subHour(),
    ]);

    expect($this->getJson('/api/v1/posts')->json('data.0.title'))->toBe('Recente');
});

it('não manda o corpo inteiro na listagem', function () {
    Post::factory()->published()->create();

    // Dez posts na página não podem virar dez textos completos no fio.
    $this->getJson('/api/v1/posts')
        ->assertOk()
        ->assertJsonMissingPath('data.0.body')
        ->assertJsonStructure(['data' => [['slug', 'title', 'excerpt', 'readingMinutes']]]);
});

it('abre um post publicado pelo slug', function () {
    Post::factory()->published()->create([
        'slug' => 'orbitas-elipticas',
        'body' => 'Corpo em **Markdown**.',
    ]);

    $this->getJson('/api/v1/posts/orbitas-elipticas')
        ->assertOk()
        ->assertJsonPath('data.slug', 'orbitas-elipticas')
        // Markdown cru: o frontend renderiza, e nenhum HTML atravessa a API.
        ->assertJsonPath('data.body', 'Corpo em **Markdown**.');
});

it('responde 404 no rascunho, não 403', function () {
    Post::factory()->create(['slug' => 'segredo']);

    // Um 403 confirmaria que o slug existe, e a existência de um rascunho já
    // é informação.
    $this->getJson('/api/v1/posts/segredo')->assertNotFound();
});

it('deixa a curadoria ver o rascunho', function () {
    $curador = User::factory()->create();
    $curador->assignRole(Role::Admin->value);

    Post::factory()->create(['slug' => 'segredo']);

    $this->withToken($curador->createToken('web')->plainTextToken)
        ->getJson('/api/v1/posts/segredo')
        ->assertOk();
});

it('deixa o autor ver o próprio rascunho', function () {
    $autor = User::factory()->create();
    $autor->assignRole(Role::Member->value);

    Post::factory()->create(['slug' => 'meu-rascunho', 'author_id' => $autor->id]);

    $this->withToken($autor->createToken('web')->plainTextToken)
        ->getJson('/api/v1/posts/meu-rascunho')
        ->assertOk();
});

it('não deixa um leitor qualquer ver rascunho alheio', function () {
    $autor = User::factory()->create();
    $intruso = User::factory()->create();
    $intruso->assignRole(Role::Member->value);

    Post::factory()->create(['slug' => 'alheio', 'author_id' => $autor->id]);

    $this->withToken($intruso->createToken('web')->plainTextToken)
        ->getJson('/api/v1/posts/alheio')
        ->assertNotFound();
});

it('filtra por busca no título', function () {
    Post::factory()->published()->create(['title' => 'Órbitas elípticas']);
    Post::factory()->published()->create(['title' => 'Cores do infravermelho']);

    $response = $this->getJson('/api/v1/posts?filter[search]=elípticas')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.title'))->toBe('Órbitas elípticas');
});

it('calcula o tempo de leitura a partir do texto', function () {
    Post::factory()->published()->create([
        'slug' => 'longo',
        // 600 palavras a 200 por minuto = 3 minutos.
        'body' => str_repeat('palavra ', 600),
    ]);

    expect($this->getJson('/api/v1/posts/longo')->json('data.readingMinutes'))->toBe(3);
});

it('nunca devolve menos de um minuto de leitura', function () {
    Post::factory()->published()->create(['slug' => 'curto', 'body' => 'Uma nota.']);

    // "0 min de leitura" é pior que impreciso: parece defeito.
    expect($this->getJson('/api/v1/posts/curto')->json('data.readingMinutes'))->toBe(1);
});

it('carrega a capa com o crédito junto', function () {
    Post::factory()->published()->create([
        'slug' => 'com-capa',
        'cover_path' => '/webb/carina-cosmic-cliffs.webp',
        'cover_credit' => 'NASA, ESA, CSA, and STScI',
        'cover_source' => 'https://esawebb.org/images/weic2205a/',
    ]);

    // Capa e crédito viajam no mesmo recurso: a interface não tem como
    // renderizar a imagem sem ter o crédito em mãos.
    $this->getJson('/api/v1/posts/com-capa')
        ->assertOk()
        ->assertJsonPath('data.coverCredit', 'NASA, ESA, CSA, and STScI')
        ->assertJsonPath('data.coverSource', 'https://esawebb.org/images/weic2205a/');
});
