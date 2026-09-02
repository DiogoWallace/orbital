# apps/web — o frontend do Orbital

Next.js 16 (App Router) · React 19 · Tailwind 4. É aqui que moram os módulos
científicos, o design system Nocturne e o **BFF**: o navegador só fala com estas
rotas, nunca com o Laravel (ADR 0004).

Este diretório é metade de um monorepo. A documentação do projeto está na raiz:
[README.md](../../README.md), [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md),
[docs/MODULES.md](../../docs/MODULES.md) e as [ADRs](../../docs/adr/).

## Não se roda `npm run dev` daqui

Node não está instalado no host, e o container `web` já executa o servidor de
desenvolvimento. Os comandos saem **da raiz do repositório**:

```bash
docker compose up -d
docker compose exec web npm run test        # física dos módulos (Vitest)
docker compose exec web npm run typecheck   # next typegen && tsc --noEmit
docker compose exec web npm run lint
```

Frontend em http://localhost:3100 — **3100, não 3000**: as portas foram
escolhidas para não colidir com os outros projetos da máquina.

`npm run typecheck` roda `next typegen` antes de propósito: `next-env.d.ts` e
`.next/types` são gerados e não versionados, e sem eles o TypeScript não conhece
nem os imports de imagem nem os tipos das rotas.

## Onde mexer

| Mudança | Onde |
|---|---|
| Módulo científico | `src/modules/<chave>/` — e leia `docs/MODULES.md` antes |
| Cor, tipografia, classe de componente | `src/styles/tokens.css` e `nocturne.css` |
| Primitiva científica reaproveitável | `src/components/lab/` — só na terceira repetição |
| Rota do BFF, sessão, cookie | `src/app/api/` |
| Tela | `src/app/(marketing)/`, `(auth)/`, `(platform)/` |

Duas regras que o código não impede e que quebram em silêncio: `simulation/` é
TypeScript puro, sem um único import de React — é o que torna a física testável
sem renderizar e determinística entre máquinas; e `registry.ts` é uma lista
manual de propósito, porque são os `import()` estáticos que fazem o bundler
separar cada módulo em seu próprio chunk. Trocar por varredura de diretório faz
todo visitante baixar todos os módulos.

## `AGENTS.md` e `CLAUDE.md` são gerados

`apps/web/AGENTS.md` carrega um bloco escrito e **re-adicionado pelo `next dev`
a cada execução** (`node_modules/next/dist/server/lib/generate-agent-files.js`),
avisando que o Next 16 tem mudanças que quebram em relação a versões anteriores.
`apps/web/CLAUDE.md` só o importa, com uma linha: `@AGENTS.md`.

Os dois são versionados. Tirar o bloco de um diff só faz ele voltar como
alteração não commitada — commitar junto com o trabalho mantém a árvore limpa.
O conteúdo é do Next, não deste projeto: as instruções do projeto estão na raiz
e em `docs/`.
