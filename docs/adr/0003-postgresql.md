# ADR 0003 — PostgreSQL 16 como banco primário

**Status:** aceito · **Data:** 2026-08-21

## Contexto

Cada módulo carrega sua configuração (`spec`) de forma diferente, e as fases
futuras envolvem séries temporais, dados orbitais e busca em conteúdo científico.

## Decisão

PostgreSQL 16, com `pg_trgm`, `unaccent` e `citext` habilitados desde o início.

## Consequências

- `jsonb` com índice GIN torna o `spec` do módulo consultável de verdade.
- `numeric` de alta precisão evita erro de arredondamento em dados científicos.
- Caminho de crescimento sem trocar de banco: TimescaleDB (séries de sensores),
  PostGIS (dados de superfície planetária), pgvector (busca semântica).
- A imagem inicializa com locale ICU pt-BR: ordenação determinística e
  independente da locale do host.

## Alternativas consideradas

- **MySQL 8:** familiar, mas JSON sem índice direto, sem índice parcial e sem
  nenhuma das extensões acima. Limitaria as fases de astronomia e química.
