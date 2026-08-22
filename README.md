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

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3100 |
| API | http://localhost:8100/api/v1 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

Conta de desenvolvimento criada pelo seed: `admin@orbital.local` / `password`
(existe apenas fora de produção).

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

No frontend:

```bash
npm run dev        # servidor de desenvolvimento
npm run test       # física dos módulos (Vitest)
npm run typecheck  # tsc --noEmit
```

## Documentação

| Documento | Assunto |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | visão geral, camadas, tecnologias e roadmap |
| [docs/MODULES.md](docs/MODULES.md) | como adicionar um módulo científico |
| [docs/adr/](docs/adr/) | decisões arquiteturais, com alternativas descartadas |

## O princípio

> O núcleo padroniza o **contrato** de um módulo, nunca o **conteúdo** dele.

Um módulo novo custa uma pasta, uma linha no registry e uma linha no banco.
Se você precisou alterar o núcleo para acomodar um módulo, é sinal de que falta
uma abstração — vale discutir antes de contornar.
