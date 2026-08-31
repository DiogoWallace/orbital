# Orbital — Arquitetura

> Plataforma científica interativa: um host de experiências (simulações,
> visualizações, exploradores de dados) organizadas em módulos independentes.

## 1. A ideia central

Orbital **não é um CMS nem um sistema administrativo**. É um host de aplicações
interativas heterogêneas. Cada módulo — foguete, órbitas, moléculas, séries
temporais de exoplanetas — é praticamente uma mini-aplicação com física, visual e
vocabulário próprios. O que eles compartilham é o *entorno*.

Disso decorre a regra que sustenta todo o resto:

> **O núcleo padroniza o _contrato_ de um módulo, nunca o _conteúdo_ dele.**

Generalizar demais (um motor de simulação configurável por JSON) trava no terceiro
módulo. Não generalizar nada dissolve a plataforma em projetos soltos.

## 2. Topologia

```
scilab/orbital
├── apps/
│   ├── api/          Laravel 13  → REST /api/v1
│   └── web/          Next.js 16  → RSC + BFF
├── packages/
│   └── contracts/    tipos TS gerados do OpenAPI
├── docker/           php-fpm 8.4 · nginx · postgres 16 · redis
└── docs/adr/         decisões arquiteturais registradas
```

```
Browser ──► Next.js (RSC + BFF) ──► Laravel API ──► PostgreSQL 16
   │                                     │
   └── simulação em tempo real           └── Redis (cache/fila)
       roda AQUI (TS / Web Worker)           + ingestão de fontes externas
```

Portas de desenvolvimento: **web 3100**, **api 8100**, **postgres 5433**,
**redis 6380** — escolhidas para não colidir com os outros projetos do WSL.

## 3. Backend (Laravel)

```
app/
├── Domain/                  núcleo de negócio, quase sem framework
│   ├── Catalog/             disciplinas, tópicos, módulos, tags
│   ├── Community/           comentários, curtidas, denúncias
│   ├── Editorial/           posts do blog
│   ├── Projects/            projetos, pesquisas, descobertas
│   ├── Simulation/          contratos: SimulationEngine, RunResult
│   ├── Datasets/            fontes externas, ingestão, séries
│   └── Identity/            usuários, papéis, políticas
├── Http/Controllers/Api/V1  controllers finos
├── Modules/<Nome>/          código específico de um módulo (opcional)
├── Support/
└── Providers/
```

**Fluxo de uma requisição:**

```
Route → FormRequest (valida) → Action (regra) → Data/DTO → Resource (serializa)
```

Controllers não contêm regra. Actions são casos de uso com um método `execute()`,
testáveis sem HTTP. DTOs tipados (`spatie/laravel-data`) atravessam as camadas;
Eloquent não vaza para a resposta.

Essas fronteiras são verificadas por testes de arquitetura no CI — ver
[ADR 0008](adr/0008-organizacao-por-dominio.md).

## 4. Frontend (Next.js)

```
src/
├── app/
│   ├── (marketing)/      landing
│   ├── (platform)/       dashboard, explorar, disciplinas, modulos, projetos,
│   │                     blog, perfil, conta
│   ├── (auth)/           login, registro
│   └── api/              BFF: proxy de auth, cookie httpOnly
├── components/
│   ├── ui/               primitivos (botão, dialog, tabs)
│   ├── layout/           shell, navegação
│   ├── data/             Chart, DataTable, StatTile, Sparkline
│   └── lab/              ⭐ primitivos científicos reutilizáveis
├── modules/              ⭐ superfície de plugin
│   ├── registry.ts
│   ├── types.ts
│   └── <module-key>/
│       ├── index.ts          definição
│       ├── Module.tsx        entrada React
│       ├── components/
│       ├── simulation/       ⚠️ TS puro, zero React
│       └── data/
├── lib/  hooks/  styles/
```

**Regra de ouro:** `modules/*/simulation/` é TypeScript puro — funções e classes
com `step(dt, params) → state`. React apenas desenha. Isso torna a física
testável no Vitest, determinística e portável para Web Worker sem tocar na UI.

## 5. Anatomia de um módulo

| Camada | Onde | Obrigatória |
|---|---|---|
| Dados | linha em `modules` (metadados + `spec` jsonb) | sim |
| Experiência | `apps/web/src/modules/<key>/` | sim |
| Compute | `apps/api/app/Modules/<Key>/` | não |

As três se encontram por uma chave: **`component_key`**.

Adicionar um módulo novo → ver [docs/MODULES.md](MODULES.md). São três passos e
**nenhuma alteração no núcleo**.

## 6. Genérico vs. específico

| Núcleo genérico | Específico do módulo |
|---|---|
| Auth, papéis, políticas | Modelo físico/matemático |
| Catálogo, taxonomia, busca, filtros | Representação visual |
| Shell do módulo, layout, navegação | Definição das variáveis e faixas |
| `ParameterPanel`, sliders, readouts, unidades | Textos e referências |
| Primitivos de gráfico e tabela | Presets e cenários |
| Loop de simulação (play/pause/reset) | Regras de interação próprias |
| Persistência e compartilhamento de runs | — |

**Regra operacional:** nasce dentro do módulo. No **segundo** módulo que precisar,
copia. No **terceiro**, promove para `components/lab/`. Abstrair na primeira
ocorrência é como se cria a abstração errada.

## 7. Tecnologias e por que cada uma

| Tecnologia | Onde | Justificativa |
|---|---|---|
| SVG + Motion | anatomia do foguete, diagramas | vetorial, cada peça é um nó do DOM → hotspot clicável, focável e acessível de graça |
| Canvas 2D | fluxo de combustível, gases, partículas | milhares de partículas a 60 fps; SVG morre nessa contagem de nós |
| React Three Fiber (WebGL) | sistema solar, moléculas | só quando a 3ª dimensão carrega informação; entra por `import()` dinâmico |
| SVG próprio (`components/data/LineChart`) | gráficos do MVP | uma linha com eixos e grade cabe em ~100 linhas; adicionar biblioteca de charting antes de precisar de escala log, barra de erro ou brush seria peso sem retorno |
| visx | *quando* os gráficos exigirem mais | D3 modular sob React — entra dentro de `components/data/`, nunca dentro de um módulo |
| uPlot | *quando* houver séries realmente grandes | centenas de milhares de pontos em canvas |
| KaTeX | fórmulas | plataforma científica sem LaTeX não é séria |
| Zustand | estado de simulação | atualiza a 60 fps fora do ciclo de render do React |
| TanStack Query | estado de servidor | cache, revalidação, estados padronizados |
| Tailwind v4 + Radix | design system | tokens em CSS vars + acessibilidade pronta |
| Zod | validação | um schema serve para form, para `spec` e para o tipo TS |
| Pest / Vitest / Playwright | testes | API / física pura / fluxos críticos |

**Deliberadamente fora agora:** GraphQL, microserviços, Kubernetes,
Elasticsearch, WebSockets, state machines. Cada um entra quando um problema real
aparecer.

## 8. Estética

Laboratório digital, não ficção científica. Base escura profunda, tinta de dado
com alto contraste, um acento usado com parcimônia, monoespaçada para leitura
numérica, malha milimetrada sutil, transições curtas e físicas,
`prefers-reduced-motion` respeitado, paletas seguras para daltonismo.
A interface é o instrumento; o dado é o protagonista.

## 9. Roadmap

| Fase | Entrega |
|---|---|
| 0 | Scaffolding, infra, ADRs, contrato de tipos |
| 1 — MVP | Landing, auth, dashboard, catálogo, taxonomia, shell de módulo, projetos |
| 2 | 🚀 Foguete: anatomia interativa em SVG com hotspots |
| 3 | 🚀 Foguete: simulação viva (fluxos, pressão, temperatura, gráficos) |
| 4 | Astronomia: ingestão de APIs públicas, explorador de datasets |
| 5 | Química/materiais (moléculas 3D), coleções, busca avançada |

Módulos de química ficam em simulação e visualização conceitual — propriedades,
estruturas, comparações. A plataforma não é um guia operacional de experimentos
perigosos.

## 10. Decisões registradas

| ADR | Assunto |
|---|---|
| [0001](adr/0001-monorepo-dois-deployables.md) | Monorepo com dois deployables |
| [0002](adr/0002-api-rest-versionada.md) | API REST versionada, sem Inertia/GraphQL |
| [0003](adr/0003-postgresql.md) | PostgreSQL 16 como banco primário |
| [0004](adr/0004-auth-sanctum-bff.md) | Sanctum + BFF no Next.js |
| [0005](adr/0005-modulo-como-plugin.md) | Módulo = metadados + componente no registry |
| [0006](adr/0006-spec-em-jsonb.md) | `spec` do módulo em JSONB |
| [0007](adr/0007-simulacao-no-cliente.md) | Simulação executa no cliente |
| [0008](adr/0008-organizacao-por-dominio.md) | Organização por domínio no Laravel |
| [0009](adr/0009-email-transacional.md) | E-mail transacional: link para o frontend, envio em fila |
| [0010](adr/0010-verificacao-de-email-porta-suave.md) | Verificação de e-mail com porta suave |
| [0011](adr/0011-login-com-google.md) | Login com o Google: OAuth na API, ticket para o BFF |
| [0012](adr/0012-blog-como-dominio-proprio.md) | Blog como domínio próprio, e autenticação opcional nas rotas públicas |
| [0013](adr/0013-comunidade-comentarios-curtidas-perfis.md) | Comunidade: comentários, curtidas e perfis públicos |
| [0014](adr/0014-reprodutibilidade-de-uma-analise.md) | Toda análise precisa ser reproduzível |
