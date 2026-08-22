# ADR 0002 — API REST versionada, sem Inertia e sem GraphQL

**Status:** aceito · **Data:** 2026-08-21

## Contexto

A plataforma precisa de simulações a 60 fps, canvas, WebGL e, no futuro, outros
consumidores (app, notebooks de análise, scripts de pesquisa).

## Decisão

API REST em `/api/v1`, stateless, com envelope `{ data, meta, links }`, erros no
formato RFC 7807 e filtros/includes declarados por whitelist.

## Consequências

- O frontend fica livre para usar RSC, streaming e code-splitting agressivo.
- A API serve qualquer cliente futuro sem reescrita.
- Exige disciplina de versionamento: `/v1` congela o contrato publicado.

## Alternativas consideradas

- **Inertia/Livewire:** acoplaria a renderização ao Laravel e inviabilizaria o
  modelo de plugins do frontend descrito no ADR 0005.
- **GraphQL:** o ganho aparece quando muitas telas pedem shapes muito variados.
  Num catálogo de shape estável, o custo (N+1, cache, complexidade de schema)
  não se paga. Reavaliar se surgir um cliente de análise verdadeiramente ad-hoc.
