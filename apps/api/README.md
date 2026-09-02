# apps/api — a API do Orbital

Laravel 13 · PHP 8.4 · PostgreSQL 16 · Sanctum. Serve `/api/v1`, e **o navegador
nunca fala com ela direto**: quem conversa é o BFF do Next, em `apps/web`
(ADR 0004).

Este diretório é metade de um monorepo. A documentação do projeto está na raiz:
[README.md](../../README.md), [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
e as [ADRs](../../docs/adr/).

## Nada roda no host

Não há PHP nem Composer instalados nesta máquina. Todo comando passa pelo
Docker, disparado **da raiz do repositório**:

```bash
docker compose up -d
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan test          # Pest
docker compose exec api vendor/bin/pint           # a CI roda pint --test
docker compose exec api php artisan tinker
```

API em http://localhost:8100/api/v1. Se a suíte falhar em massa com
`UnexpectedValueException` do Monolog, a imagem foi construída antes do
`USER ${UID}` e não escreve em `storage/`: `docker compose build api queue`.
Depois de `docker compose restart api`, reinicie o `nginx` junto — ele resolve o
IP do php-fpm uma vez só, na subida.

## Como o código está organizado

`app/Domain/<Contexto>/` é o núcleo, quase sem framework — hoje `Catalog`,
`Community`, `Datasets`, `Editorial`, `Identity`, `Projects` e `Simulation`,
cada um com o que precisa de `Models/ Data/ Actions/ Queries/ Enums/ Policies/
Notifications/ Support/` (ADR 0008).

Quatro regras não são convenção, são teste de arquitetura em
`tests/Architecture/LayeringTest.php`, e derrubam a CI quando quebradas:

- `App\Domain` nunca importa `App\Http`;
- controller não guarda regra de negócio, e Eloquent não chega na resposta —
  quem cruza as camadas é DTO tipado;
- Action expõe um único `execute()`;
- nenhum `dd`, `dump` ou `ray` sobrevive.

Duas armadilhas que já custaram semanas e valem para toda rota nova: rota
pública entra no grupo `auth.optional`, senão o token do cabeçalho é ignorado e
um curador logado não vê o próprio rascunho (ADR 0012); rota de escrita entra
no grupo `verified` (ADR 0010). E teste de visibilidade usa `withToken()`,
nunca `actingAs()` — foi `actingAs()` que escondeu o primeiro caso por três
semanas com o teste passando.

Os testes rodam contra PostgreSQL de verdade, nunca SQLite: o schema depende de
`jsonb` e de índice GIN (ADR 0003).

## Isto não é o README do Laravel

O texto do esqueleto foi removido de propósito. Ele falava do framework e não
deste projeto, e mandava instalar o [Laravel
Boost](https://laravel.com/docs/ai) com `composer require laravel/boost --dev`
— que nunca esteve instalado aqui e não é para ser. Quem chegasse por este
arquivo seguia instrução de outro lugar achando que era daqui.
