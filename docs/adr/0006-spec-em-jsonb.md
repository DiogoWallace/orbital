# ADR 0006 — `spec` do módulo em JSONB, não normalizado

**Status:** aceito · **Data:** 2026-08-21

## Contexto

Cada módulo define variáveis próprias (massa, empuxo, temperatura, concentração)
com unidades, faixas, passos e presets muito distintos entre si.

## Decisão

Guardar a definição em uma coluna `spec jsonb`, validada na aplicação por um
schema versionado junto ao módulo, com índice GIN.

## Consequências

- Nenhuma migration é necessária para cada módulo novo.
- O mesmo schema (Zod no front, DTO tipado no back) valida entrada e tipa saída.
- Consultas por conteúdo do `spec` continuam possíveis via GIN.
- Contrapartida assumida: o banco não garante a forma do `spec`. A garantia é da
  aplicação — por isso o schema é obrigatório e testado.

## Alternativas consideradas

- **Tabela `module_parameters` normalizada:** viraria EAV — consultas ruins e
  nenhuma tipagem real. Só valeria se precisássemos filtrar módulos por valor de
  variável, que não é um caso de uso da plataforma.
