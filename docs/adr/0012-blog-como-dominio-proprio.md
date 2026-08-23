# ADR 0012 — Blog como domínio próprio, e autenticação opcional nas rotas públicas

**Status:** aceito · **Data:** 2026-08-23

## Contexto

A plataforma precisava de um blog editorial: notas sobre a construção, decisões
que valeram discussão, explicações curtas do que os módulos simulam. Duas
perguntas apareceram junto.

A primeira é onde o post mora. Já existe `modules`, com `kind` — e um dos
valores é `article`. A tentação de acrescentar `kind: post` é real.

A segunda apareceu ao escrever o primeiro teste: um curador logado conseguiria
abrir o próprio rascunho?

## Decisão

**Tabela `posts` própria, em `App\Domain\Editorial`.** Um módulo é uma
experiência interativa com `spec`, `component_key` e dificuldade; um post é
texto com data. No mesmo lugar, cada linha carregaria metade das colunas nulas,
e todo filtro novo do catálogo teria de decidir se vale para post — e vice-versa.
`kind: article` continua existindo para o que é *conteúdo de módulo*: uma
explicação que pertence ao catálogo, indexada por disciplina e tópico.

O corpo é **Markdown no banco**, renderizado no frontend pelo mesmo pipeline das
seções de módulo (GFM + KaTeX). Nenhum HTML atravessa a API, então não há o que
sanitizar. Publicar não exige deploy, e a data em `published_at` funciona como
agenda sem processo em background — a mesma mecânica do catálogo.

**Capa e crédito viajam juntos** (`cover_path`, `cover_credit`,
`cover_source`). Guardar a imagem sem o crédito ao lado é violação de licença
esperando acontecer; no mesmo recurso, a interface não consegue renderizar a
capa sem ter o crédito em mãos.

**As rotas públicas passam por `auth.optional`.** Este é o segundo ponto, e ele
corrigiu um bug que já existia no catálogo.

## O bug que apareceu junto

Rotas públicas não passam por `auth:sanctum`, porque anônimo precisa entrar.
Sem nenhum middleware de autenticação, porém, o guard padrão continua sendo o
`web`, baseado em sessão — que numa API stateless nunca tem ninguém. O token do
cabeçalho era simplesmente ignorado.

Resultado: `ModulePolicy::view()` e `ModuleCatalogQuery` checavam `isCurator()`
e recebiam `null`, mesmo com um token de administrador válido na requisição. Um
curador logado pelo BFF **não enxergava o próprio rascunho**.

O teste não pegava porque usava `actingAs()`, que popula o guard padrão
diretamente e nunca exercita o caminho do token. Verificado por HTTP real antes
da correção: `/api/v1/me` respondia 200 e
`/api/v1/modules/anatomia-de-um-foguete` respondia 404 com o mesmo token.

`ResolveOptionalUser` chama `shouldUse('sanctum')` — o mesmo mecanismo que o
`Authenticate` do framework usa ao autenticar. Trocar apenas o
`setUserResolver` do request não resolveria: `Gate`, e portanto toda policy,
resolve o usuário pelo guard padrão, não pelo request. Sem token, o guard
devolve `null` e nada muda: a rota nunca rejeita ninguém, só passa a enxergar
quem se identificou.

## Consequências

- Rascunho é revisável no ambiente real: o autor abre a URL final, logado, e vê
  a página como ela vai ficar.
- Rota pública nova precisa entrar no grupo `auth.optional` para herdar esse
  comportamento. É o mesmo tipo de esquecimento que o grupo `verified` tem
  (ADR 0010), e a defesa é a mesma: teste que exercita o caminho do token.
- **Testes de visibilidade devem usar `withToken()`, não `actingAs()`.** Foi
  `actingAs()` que escondeu este bug por três semanas.
- Escrever um post, por ora, é seed ou tinker. Uma tela de edição é um projeto
  próprio, e a alternativa — Markdown no repositório — foi descartada porque
  publicar passaria a exigir deploy.

## Alternativas consideradas

- **`kind: post` em `modules`.** Menos uma tabela, ao custo de dois conceitos
  disputando o mesmo esquema.
- **Markdown versionado no repositório.** Revisão por pull request de graça, e
  nenhuma tela de edição jamais necessária. Descartado porque toda publicação
  viraria um deploy, e porque um agregador de notícias — se um dia entrar — não
  caberia nesse modelo.
- **Guard padrão `sanctum` no `config/auth.php`.** Resolveria em uma linha, mas
  mudaria a resolução de guard de toda a aplicação, inclusive onde
  `spatie/laravel-permission` decide o `guard_name` dos papéis. Um middleware
  explícito nas rotas que precisam tem raio de alcance conhecido.
