# Orbital

Plataforma científica interativa — um laboratório digital de simulações,
visualizações e análise de dados em física, astronomia, engenharia e química.

**No ar em [orbitalexperiments.com](https://orbitalexperiments.com)**

```
apps/api    Laravel 13  → API REST /api/v1
apps/web    Next.js 16  → RSC + BFF
docker/     php-fpm 8.4 · nginx · postgres 16 · redis
docs/       arquitetura e decisões registradas (ADRs)
```

## Começando

**Pré-requisito:** Docker Desktop com a integração WSL ativada para a distro
`Ubuntu` (Settings → Resources → WSL Integration).

```bash
cd ~/projects/orbital
cp .env.example .env
docker compose up -d
docker compose exec api php artisan migrate --seed
```

Uma vez por clone, ligue os hooks versionados — eles removem atribuição de IA
da mensagem e recusam título fora do padrão de
[docs/CONVENCOES-DE-COMMIT.md](docs/CONVENCOES-DE-COMMIT.md):

```bash
git config core.hooksPath .githooks
git config commit.template .gitmessage
```

(`make hooks` faz as duas linhas, quando o `make` está instalado.)

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3100 |
| API | http://localhost:8100/api/v1 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |
| Mailpit (e-mails de teste) | http://localhost:8125 |

Nenhum e-mail sai da máquina em desenvolvimento: tudo cai no Mailpit, onde
dá para ver o HTML renderizado e a fonte da mensagem.

Conta de desenvolvimento criada pelo seed: `admin@orbital.local` / `password`
(existe apenas fora de produção). Ela nasce com o e-mail não confirmado, então
a plataforma mostra o aviso de confirmação pendente — o link do "Reenviar" cai
no Mailpit.

## Comandos

O `Makefile` é só um atalho. Se `make` não estiver instalado
(`sudo apt install make`), os comandos equivalentes são:

| Atalho | Comando direto |
|---|---|
| `make up` | `docker compose up -d` |
| `make down` | `docker compose down` |
| `make logs` | `docker compose logs -f --tail=100` |
| `make shell` | `docker compose exec api bash` |
| `make db` | `docker compose exec postgres psql -U orbital -d orbital` |
| `make migrate` | `docker compose exec api php artisan migrate` |
| `make fresh` | `docker compose exec api php artisan migrate:fresh --seed` |
| `make test` | `docker compose exec api php artisan test` |
| `make hooks` | `git config core.hooksPath .githooks` **e** `git config commit.template .gitmessage` |

No frontend:

```bash
npm run dev        # servidor de desenvolvimento
npm run test       # física dos módulos (Vitest)
npm run typecheck  # tsc --noEmit
```

## Imagens

As imagens do James Webb na landing são da **ESA/Webb**, sob
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). O crédito de cada uma
aparece junto da imagem, com link ativo, como a licença exige — mexer nisso
quebra a conformidade, não só o layout.

Os arquivos versionados em `apps/web/public/webb/` são WebP convertidos a partir
dos JPEG de divulgação. Para acrescentar outra:

```bash
# baixe o JPEG em apps/web/.webb-src/<id-da-esa>.jpg, mapeie o nome no script
docker compose exec web node scripts/processar-webb.mjs
```

Depois acrescente a entrada em `apps/web/src/lib/webb.ts`, com os dados do
objeto copiados da página da ESA — não de memória.

## Quando algo não sobe

**`Permission denied` em `storage/`** — a imagem da API roda com o UID do host
(`docker/php/Dockerfile`), e uma imagem construída antes disso roda como
`www-data`, que não escreve no bind mount. O sintoma costuma ser a suíte de
testes falhando em massa com `UnexpectedValueException` do Monolog:

```bash
docker compose build api queue && docker compose up -d api queue
```

**502 do nginx depois de `docker compose restart api`** — o nginx resolve o
endereço do php-fpm uma vez, na subida, e o container reiniciado ganha IP novo:

```bash
docker compose restart nginx
```

## Documentação

| Documento | Assunto |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | visão geral, camadas, tecnologias e roadmap |
| [docs/MODULES.md](docs/MODULES.md) | como adicionar um módulo científico |
| [docs/adr/](docs/adr/) | decisões arquiteturais, com alternativas descartadas |
| [docs/CONVENCOES-DE-COMMIT.md](docs/CONVENCOES-DE-COMMIT.md) | formato das mensagens de commit, tipos e escopos |
| [docs/CONTINUAR-EM-OUTRA-MAQUINA.md](docs/CONTINUAR-EM-OUTRA-MAQUINA.md) | o que o clone não traz, e como reconstruir |
| [tools/tess/](tools/tess/) | ingestão de dados do TESS e a linha de base medida |
| [tools/brenda/](tools/brenda/) | o classificador, e o primeiro treino |

## O princípio

> O núcleo padroniza o **contrato** de um módulo, nunca o **conteúdo** dele.

Um módulo novo custa uma pasta, uma linha no registry e uma linha no banco.
Se você precisou alterar o núcleo para acomodar um módulo, é sinal de que falta
uma abstração — vale discutir antes de contornar.
