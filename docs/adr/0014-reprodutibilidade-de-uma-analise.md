# ADR 0014 — Toda análise precisa ser reproduzível

**Status:** aceito · **Data:** 2026-08-31

## Contexto

Até aqui a plataforma simulava. Uma simulação é reproduzível quase por acidente:
os parâmetros são a entrada inteira, e `simulation_runs` já guarda parâmetros,
resultado e `model_version` desde o primeiro dia.

A partir do Research Lab, a plataforma passa a **analisar dado de terceiros**. E
uma análise não é reproduzível por acidente: o mesmo algoritmo, com os mesmos
parâmetros, sobre uma versão diferente do mesmo arquivo, devolve outro número —
sem avisar ninguém.

O objetivo declarado do projeto é chegar a resultados que outra pessoa possa
usar. Um resultado que ninguém consegue refazer não é um resultado; é uma
anedota com gráfico. Esta decisão existe para que a diferença seja estrutural, e
não uma questão de disciplina de quem escreve o código.

## Decisão

**Uma execução só é gravável se a cadeia inteira estiver junto dela.** Sete elos:

```
dataset → versão do dado → algoritmo → parâmetros → versão do código → execução → resultado
```

Nenhum deles é opcional. Uma execução que não consegue nomear o dado de onde
saiu não deve ser gravada — vale mais o erro na hora do que um registro que
parece completo e não é.

**A versão do dado é do dado, não da consulta.** Um `Dataset` guarda origem,
missão, instrumento, alvo, data de obtenção e uma soma de verificação do arquivo
recebido. Se a fonte republicar o arquivo, é um `Dataset` novo, não uma
atualização do antigo: execuções passadas continuam apontando para o que
realmente as produziu.

**A versão do código que importa é a do método, não a do repositório.** Cada
módulo exporta `MODEL_VERSION`, gravado junto da execução. O `git` diz o que o
repositório inteiro era naquele dia; `MODEL_VERSION` diz o que *aquele método*
era, que é a pergunta que alguém faz cinco anos depois ao comparar dois números.

**A citação é por identificador estável.** A chave de `simulation_runs` já é
UUID justamente para isso. Um resultado citado em texto aponta para uma execução
que pode ser reaberta com os mesmos parâmetros e o mesmo dado.

**Determinismo é requisito, e ele tem um limite conhecido.** A análise roda no
cliente (ADR 0007) em TypeScript puro, com passo fixo e nenhuma tolerância de
convergência. Mas o ECMAScript **não** especifica o resultado exato das funções
transcendentais: `sin`, `cos`, `log`, `exp` e `pow` são aproximadas pela
implementação, e podem diferir nos últimos bits entre motores.

Auditando o que existe hoje, a fronteira cai num lugar conveniente:

| Camada | Funções usadas | Reprodutível entre motores |
|---|---|---|
| `detrend`, `bls`, `analysis` | comparação, arredondamento, `sqrt` | sim, na prática |
| `synthetic` | `sin`, `cos`, `log` | **não garantido** |

Ou seja: **a análise sobre um dado recebido é portável; a geração da curva
sintética não é.** A consequência prática é que uma curva sintética usada como
referência de teste ou como material de ensino deve ser **gravada como dado**, e
não regerada a partir da semente em outra máquina. A semente reproduz a curva no
mesmo motor, e isso basta para teste — não basta para citação.

## Consequências

- `Dataset` ganha soma de verificação e data de obtenção como campos
  obrigatórios, não metadados de conveniência. É o mesmo raciocínio do crédito
  das imagens: o dado sem a proveniência ao lado é uma dívida esperando vencer.
- Toda execução de análise passa a exigir referência a um `Dataset`. Módulos de
  simulação pura continuam sem essa exigência — não há dado externo neles.
- **O elo mais fraco é o `MODEL_VERSION` escrito à mão.** Nada impede alguém de
  mudar o BLS e esquecer de incrementá-lo, e aí duas execuções incomparáveis
  passam a alegar a mesma versão. Mitigação possível, e ainda não feita: um teste
  que falhe quando o arquivo do método mudar sem a constante mudar junto.
- Publicar um resultado passa a custar mais do que escrever um texto. É o preço,
  e é o ponto.

## Alternativas consideradas

- **Guardar só os parâmetros, como hoje.** Suficiente para simulação, onde os
  parâmetros são a entrada inteira. Insuficiente no minuto em que a entrada passa
  a incluir um arquivo que alguém pode republicar.
- **Versionar o dado pelo commit do repositório.** Amarra o dado ao código e
  quebra quando o dado deixar de caber no `git`, que é o caso já no segundo
  conjunto de alvos.
- **Exigir bit-a-bit igual entre motores.** Obrigaria a reimplementar as funções
  transcendentais ou a tirar a análise do navegador — caro demais para o ganho,
  e desnecessário: gravar a curva como dado resolve o único caso em que isso
  importaria.
