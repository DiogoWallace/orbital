# ADR 0005 — Módulo científico = metadados no banco + componente no registry

**Status:** aceito · **Data:** 2026-08-21

## Contexto

A plataforma deve suportar dezenas ou centenas de módulos heterogêneos sem que
adicionar um deles exija reconstruir a aplicação.

## Decisão

Um módulo tem três camadas ligadas por uma única chave, `component_key`:

| Camada | Onde vive | Obrigatória |
|---|---|---|
| Dados (metadados, taxonomia, conteúdo, `spec`) | tabela `modules` | sim |
| Experiência (visual, interação, física) | `apps/web/src/modules/<key>/` | sim |
| Compute / ingestão | `apps/api/app/Modules/<Key>/` | não |

A página `modulos/[slug]` lê `component_key` e resolve o componente por
`import()` dinâmico via `modules/registry.ts`. Chave desconhecida → fallback
explícito, nunca tela branca.

## Consequências

- Módulo novo = uma pasta + uma linha no registry + uma linha no banco.
- Code-splitting automático: quem abre química não baixa o bundle do foguete.
- O núcleo nunca é alterado para acomodar um módulo específico.
- O registry é a única lista manual — proposital: garante que o bundler consiga
  fazer análise estática dos imports.

## Alternativas consideradas

- **Motor genérico dirigido por JSON:** tentador, mas a física de um foguete não
  cabe na mesma abstração de uma reação química. Trava no terceiro módulo.
- **Cada módulo como aplicação independente:** perde catálogo, busca, sessão e
  identidade visual comuns.
