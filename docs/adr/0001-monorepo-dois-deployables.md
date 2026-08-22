# ADR 0001 — Monorepo com dois deployables

**Status:** aceito · **Data:** 2026-08-21

## Contexto

A plataforma tem duas aplicações que evoluem em conjunto: a API (Laravel) e a
interface (Next.js). Cada módulo científico novo tende a tocar os dois lados no
mesmo dia — uma migration/seed no backend e uma pasta de componente no frontend.

## Decisão

Um único repositório com `apps/api`, `apps/web` e `packages/contracts`.

## Consequências

- O contrato entre API e frontend muda num commit só; nada de PRs pareados.
- Os tipos TypeScript gerados do OpenAPI vivem em `packages/contracts` e são
  consumidos pelo `apps/web` — uma quebra de contrato falha no build, não em produção.
- Deploys continuam independentes: são dois artefatos, não um monolito.

## Alternativas consideradas

- **Dois repositórios:** justifica-se quando times distintos cuidam de cada lado
  e os ciclos de release divergem. Não é o caso; o custo seria versionar o
  contrato entre repos desde o primeiro módulo.
