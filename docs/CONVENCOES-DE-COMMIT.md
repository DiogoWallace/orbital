# Convenções de commit

O histórico é o único lugar onde fica registrado **por que** algo foi feito.
O corpo dos commits deste repositório já cumpre esse papel — carrega número,
resultado negativo e a tentativa que foi descartada. O título é que não dizia a
natureza da mudança: `Implementa multi-setor, e mede que ele nao resolve o que
devia` e `Restaura o bit de execucao do lote-baixar.py` chegam ao `git log` com
o mesmo peso, e não são a mesma coisa.

A partir de **02/09/2026** todo commit novo leva um prefixo de tipo, no formato
do [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/),
com dois tipos a mais que o projeto precisa.

**O histórico anterior fica como está.** `main` é público e tem clone fora daqui;
reescrever quarenta commits para ganhar prefixo trocaria um histórico legível por
um histórico legível e quebrado. O corte é a data.

---

## O formato

```
<tipo>(<escopo>)!: <resumo no imperativo>

<corpo — por quê, com os números quando houver medição, em 80 colunas>

<rodapé — Refs, Closes, BREAKING CHANGE>
```

O escopo e o `!` são opcionais. O corpo é obrigatório sempre que a mudança tem
um porquê que o diff não mostra, o que aqui é quase sempre.

---

## Tipos

| Tipo | Quando |
|---|---|
| `feat` | capacidade nova — o usuário, a API ou o módulo passam a fazer algo que não faziam |
| `fix` | corrige comportamento errado que já estava em `main` |
| `docs` | a documentação **é** a mudança: `docs/`, `README.md`, a skill, um cabeçalho de script |
| `refactor` | muda a forma sem mudar o comportamento — nenhum teste precisa mudar junto |
| `perf` | desempenho, com o número de antes e o de depois no corpo |
| `test` | teste para código que já existe, sem tocar em produção |
| `build` | Docker, Composer, npm, `Makefile`, imagem |
| `ci` | `.github/workflows/` |
| `chore` | o resto: `.gitignore`, hooks, arquivo movido, bytecode removido |
| `exp` | experimento medido — o entregável é a medição, não o código |
| `revert` | desfaz um commit, com o hash no corpo |

### Sobre o `exp`

Boa parte do trabalho recente não cabe em `feat` nem em `fix`. `Treina o
primeiro modelo, e ele nao bate a linha de base` entregou uma medição negativa:
o código é o meio, o resultado é a entrega. Chamar isso de `feat` mentiria —
ninguém ganhou capacidade nenhuma; chamar de `fix` mentiria também.

`exp` marca esses commits, e é o que faz o resultado negativo continuar
encontrável. Foi assim que o `odd-even` foi resgatado: ele tinha sido condenado
num treino e reabilitado dois commits depois, quando o preparo do dado mudou.

Use `exp` quando o commit responde a uma pergunta com número. Se a medição
apenas acompanha uma capacidade nova, o tipo é `feat` e o número vai no corpo.

---

## Escopos

Um só, minúsculo, opcional. Ele diz **onde**, para o resumo poder dizer **o quê**.

| Escopo | Onde |
|---|---|
| `api` | `apps/api/` em geral |
| `identity`, `catalog`, `editorial`, `community`, `datasets`, `projects`, `simulation` | o domínio correspondente em `apps/api/app/Domain/` |
| `web` | `apps/web/` em geral |
| `orbital-sandbox`, `rocket-anatomy`, `transit-explorer` | a chave do módulo em `apps/web/src/modules/` |
| `lab` | `apps/web/src/components/lab/` — o que já foi promovido de dentro de um módulo |
| `design` | `styles/tokens.css`, `styles/nocturne.css`, `components/ui/` |
| `db` | migrations e seeders |
| `tess`, `brenda` | `tools/tess/`, `tools/brenda/` |
| `docker`, `deploy` | `docker/` e `docker-compose.yml`; `deploy/` e `docker-compose.prod.yml` |
| `adr` | uma decisão em `docs/adr/` (`docs(adr): registra…`) |
| `skill` | `.claude/skills/orbital/` |

Prefira o escopo mais específico que ainda seja verdade: um módulo tem escopo
próprio, e `web` fica para o que atravessa a aplicação inteira.

Se o commit precisa de dois escopos, quase sempre são dois commits. A exceção
honesta é a mudança que atravessa a pilha por natureza — rota nova no Laravel
mais a chamada no BFF —, e aí o escopo é o do domínio, não `api,web`.

---

## O título

- **Português, imperativo, terceira pessoa:** `adiciona`, `corrige`, `mede`,
  `remove`. Nunca `adicionado`, `adicionei`, `adicionando`.
- **Minúscula depois dos dois pontos**, salvo nome próprio: `feat(brenda):
  treina Brenda sobre 262 alvos rotulados`.
- **Sem ponto final.**
- **No máximo 72 caracteres**, contando o prefixo. O alvo é 60.
- **Com acentuação.** Os commits de 26/08 em diante perderam os acentos porque a
  mensagem passou por `wsl.exe -m`; a solução está na seção do fim.
- **Diz o que muda, não onde.** O escopo já disse onde.

O teste do título: lido sozinho no `git log --oneline`, ele responde o que mudou
para quem usa o projeto?

| Assim não | Assim |
|---|---|
| `Atualiza arquivos` | `docs(skill): registra o terceiro módulo e a lacuna do painel` |
| `fix: bug` | `fix(api): resolve o usuário do token nas rotas públicas` |
| `feat: adicionado o blog` | `feat(editorial): publica o blog com corpo em Markdown` |
| `Corrige o transito` | `fix(tess): corrige a leitura do manifesto com CRLF do Python` |
| `feat(web): mexe no ParameterPanel e no seeder e no Caddy` | três commits |

---

## O corpo

Separado do título por uma linha em branco, quebrado em **80 colunas** — a
largura que o histórico já usa (665 linhas de corpo medidas, p90 em 79) e a
mesma de `docs/`.

O que o corpo tem que responder é **por que**, porque o diff já responde o quê.
As regras abaixo são a descrição do que os bons commits daqui já fazem:

- **Número, quando houve medição.** Antes e depois, com unidade: `pico de 0,0338
  para 0,0399, profundidade medida de 0,0240% para 0,0283% — contra 0,0321%
  publicado`.
- **Resultado negativo entra igual ao positivo**, com o número que o sustenta. É
  o que impede a próxima tentativa de repetir a mesma coisa. `O biweight mediu
  quatro vezes menos pico e erro de período dez vezes maior` vale mais no
  histórico do que fora dele.
- **O que foi tentado e removido fica escrito**, com o motivo.
- **A causa, não o sintoma.** `nginx resolve o php-fpm uma vez, na subida` é a
  informação; `corrige 502` é o sintoma.
- **Commits longos podem ter subtítulos em caixa alta**, como o histórico já usa
  (`O BIWEIGHT MEDIU PIOR E FOI REMOVIDO`). Acima de uns quarenta versos de
  corpo, eles são o que torna a mensagem navegável.

Corpo é dispensável só quando não há porquê: erro de digitação, arquivo movido,
versão de dependência.

---

## Rodapés

```
Refs: ADR 0014
Refs: docs/MODULES.md
Closes #12
BREAKING CHANGE: o spec dos módulos semeados perdeu `hotspots.legend`;
  rode `php artisan db:seed --class=ModuleSeeder` depois de migrar.
```

`BREAKING CHANGE:` é obrigatório junto do `!` no título, e explica **o que
quebra e o que fazer** — não só o que mudou.

Aqui, quebra: mudar a forma de um `spec` já semeado, renomear coluna que o web
lê, mudar o contrato de `SimulationEngine` ou de `src/modules/types.ts`. Não
quebra: rota nova, campo novo opcional. A API é versionada (ADR 0002), então
quebrar `/api/v1` de verdade é assunto de `/api/v2`, não de um commit com `!`.

---

## Sem atribuição de IA

Nada de `Co-Authored-By: Claude`, nada de `🤖 Generated with…` — em commit, em
descrição de PR, em release ou em mensagem de deploy. O hook do repositório
remove o trailer do commit automaticamente; **descrição de PR ele não alcança**.

---

## O hook

Os hooks vivem versionados em `.githooks/`, e uma vez por clone:

```bash
git config core.hooksPath .githooks
git config commit.template .gitmessage
```

Isso aponta o `core.hooksPath` para `.githooks/` e registra o `.gitmessage` como
template de mensagem. `make hooks` faz as duas linhas de uma vez — mas o `make`
não vem instalado no Ubuntu do WSL (`sudo apt install make`), então as duas
linhas acima são o caminho que sempre funciona. O `commit-msg` faz duas coisas: retira a atribuição de IA
e recusa título fora do padrão, com o motivo.

Antes de `make hooks` existir, o hook era reconstruído à mão em cada clone e
sumia quando ninguém lembrava — é o que a seção 2 de
[CONTINUAR-EM-OUTRA-MAQUINA.md](CONTINUAR-EM-OUTRA-MAQUINA.md) descrevia.

**Escreva a mensagem em arquivo, não em `-m`:**

```bash
git commit -F .git/MENSAGEM
```

Um `git commit -m` com texto longo passando por `wsl.exe` chega mangled e sem
acento — é a origem dos `transito` e `periodo` no histórico de agosto. Editor
(`git commit` puro) e `-F` com arquivo escrito dentro do WSL não têm o problema.

---

## Exemplos

Um `fix` com a causa no corpo:

```
fix(api): resolve o usuário do token nas rotas públicas

As rotas públicas usavam o guard padrão `web` numa API stateless, então o
token do cabeçalho era simplesmente ignorado: um curador logado não via o
próprio rascunho, e o teste passava porque usava `actingAs()`, que popula o
guard direto e nunca exercita o caminho do token.

Middleware `ResolveOptionalUser` com `shouldUse('sanctum')`, e o teste de
visibilidade passou a usar `withToken()`.

Refs: ADR 0012
```

Um `exp` com resultado negativo:

```
exp(brenda): treina o primeiro modelo, e ele não bate a linha de base

262 alvos rotulados, seis features do BLS, validação cruzada estratificada,
acurácia balanceada — a mesma métrica da linha de base, para a comparação
significar alguma coisa.

A regressão empata dentro do desvio (67,3% contra 66,5%) e as árvores ficam
atrás. Um limiar único sobre profundidade continua tão bom quanto o modelo.

O gargalo não é o classificador: 262 amostras com seis features fazem as
árvores decorarem, e profundidade, pico e S/R medem a mesma grandeza três
vezes — os pesos saem em +0,97 e -0,45.
```

Um `feat` de módulo, curto porque não há mistério:

```
feat(rocket-anatomy): publica a anatomia do foguete com 12 sistemas

Doze sistemas selecionáveis sobre o SVG, narrativa no `spec`, dentro da casca
de `modulos/[slug]` — pasta, linha no registry e linha no seeder, sem tocar no
núcleo.

Refs: ADR 0005
```

---

## Dúvidas de classificação

| Situação | Tipo |
|---|---|
| Mudei código e a documentação dele junto | o da mudança principal (`feat`, `fix`…). `docs` é quando a documentação é a mudança |
| Corrigi algo que quebrei na mesma branch, ainda não em `main` | não é `fix` — emende o commit original |
| Movi ou renomeei arquivo sem mudar nada | `chore` |
| Mudei a forma do código, comportamento igual | `refactor` |
| Escrevi teste para código que já existia | `test`. Teste que nasce com a feature vai dentro do `feat` |
| Mudei token de design | `feat(design)` se muda o que se vê, `chore(design)` se não |
| Subi versão de dependência | `build` |
| Acrescentei um ADR | `docs(adr)` |
| Ingeri dado novo, ou mudei o pipeline que o baixa | `feat(tess)`; a medição em cima dele é `exp` |
