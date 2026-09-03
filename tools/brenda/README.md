# Brenda

O classificador do Orbital. Recebe as features que o BLS mede e tenta separar
planeta confirmado de falso positivo.

```bash
source ~/.venvs/orbital-tess/bin/activate
pip install scikit-learn
python3 treinar.py --dados dados/resultados.csv
```

## Os dados vêm versionados

`dados/resultados.csv` e `dados/manifesto.csv` são as **saídas** do pipeline —
262 linhas, 68 KB — e estão no repositório de propósito: com eles o treino roda
em qualquer máquina sem rebaixar 103 MB de curvas, e a linha de base é
reproduzível por quem clonar.

O que **não** vem: as curvas em si. Elas ficam fora do repositório
(`~/dados/tess-lote/curvas/`) e se regeram com
`tools/tess/lote-baixar.py` — algumas horas de download.

`manifesto.csv` carrega os rótulos e valores publicados, todos da tabela TOI do
NASA Exoplanet Archive; `resultados.csv` carrega o que o método mediu. A
separação entre os dois é a mesma de sempre: o que veio de fora e o que nós
calculamos não se misturam na mesma coluna.

Treina **fora da aplicação**, de propósito. A análise roda no cliente (ADR 0007);
treinar não. Se um dia a inferência precisar rodar no servidor, o contrato
`SimulationEngine` existe vazio desde o primeiro commit e é por ele que ela
entra.

---

## Primeiro treino — 02/09/2026

262 alvos (112 planetas confirmados, 150 falsos positivos), seis features,
validação cruzada estratificada de 5 dobras, acurácia balanceada.

| conjunto | melhor feature isolada | regressão logística | árvores |
|---|---|---|---|
| todos (262) | **66,5%** | 67,3% (±6,0) | 61,7% (±4,0) |
| S/R > 15 (162) | **72,9%** | 70,8% (±10,7) | 65,5% (±8,0) |

**O modelo não bateu um limiar único.** A regressão empata dentro do desvio; as
árvores ficam claramente atrás. Isso não é falha de execução — é o resultado, e
ele diz três coisas úteis.

### 1. O conjunto é pequeno demais para o modelo escolhido

262 amostras com seis features fazem árvores impulsionadas decorarem. O desvio
entre dobras (±8 a ±10 pontos no subconjunto menor) é da ordem da própria
diferença que se quer medir. Antes de trocar de modelo, é preciso trocar de
quantidade.

### 2. As features estão correlacionadas, e isso aparece nos pesos

Profundidade sai com peso +0,97 e **altura do pico com −0,45** — a mesma
grandeza física puxando em direções opostas. Não é descoberta sobre planetas: é
assinatura de colinearidade. Profundidade, pico e S/R medem, todas, "quão forte
é a queda". Somar três versões da mesma medida não acrescenta informação, só
instabilidade.

### 3. Falta a feature que de fato separa

As métricas que a triagem real usa não estão aqui: deslocamento do centroide
(a queda está na estrela-alvo ou numa vizinha?), formato do trânsito (V de
roçadura contra U de planeta), consistência da profundidade entre trânsitos.
Nenhuma delas sai do BLS — todas exigem voltar ao pixel ou modelar a forma.

## Uma feature foi removida depois de treinar

`periodo_recuperado` saiu como a mais forte no primeiro treino, com peso mais
que o dobro da segunda. Não por física: a seleção do lote filtra candidatos por
período abaixo de nove dias, então a coluna codifica **o recorte da amostra**. Um
modelo que a use aprende como o conjunto foi montado.

Ficou registrado no código, na lista `PROIBIDAS`, ao lado das que vazam o rótulo
de forma mais óbvia — `erro_periodo_rel` compara com o valor publicado, que só
existe onde alguém já decidiu a resposta.

## O que o script se recusa a fazer

- **Acurácia dentro do treino.** Com este tamanho, qualquer modelo decora.
- **Acurácia bruta.** As classes são desiguais; responder sempre "falso
  positivo" acertaria 57% sem aprender nada. A métrica é balanceada.
- **Comparar com linha de base de outro recorte.** Ela é recalculada em cada
  corte, dentro do próprio script, em vez de citada de memória — trocar o
  subconjunto entre os dois lados é a forma mais fácil de declarar vitória sem
  ter vencido.

## Segundo treino — 02/09/2026, com a forma do trânsito

A conclusão do primeiro treino apontava "falta a feature que de fato separa", e
a colinearidade dizia que mais uma medida de amplitude não serviria. Entrou
então `forma`: a razão entre a largura a 75% e a 50% da profundidade — fundo
chato (planeta, ~1) contra bico (roçadura, ~0,5). É ortogonal por construção,
porque não mede quão fundo, mede o formato.

Ela **funciona sozinha**:

| feature isolada | todos (262) | período <1% e S/R>15 (148) |
|---|---|---|
| profundidade | 66,5% | 75,7% |
| **forma** | **65,1%** | **72,3%** |

E **não melhorou o modelo**: a regressão caiu de 67,3% para 65,5%, as árvores de
61,7% para 60,2%.

### Por que uma feature boa não ajuda

Os quartis mostram: planeta q25 = 0,538, falso positivo q75 = 0,667. As
distribuições se sobrepõem quase inteiras, e a diferença de medianas (0,700
contra 0,556) esconde isso.

Com 262 amostras e sete features, o modelo não tem como estimar a combinação —
o desvio entre dobras chega a doze pontos, maior que qualquer ganho que se
queira medir. **Duas tentativas independentes agora apontam a mesma restrição:
o gargalo é o tamanho da amostra, não a escolha de features.**

Parar de adicionar feature é a conclusão. A medição já disse duas vezes onde
está o problema.

## Multi-setor — 02/09/2026: a hipótese não se confirmou

A conclusão dos dois treinos era "mais dado antes de mais modelo", e o caminho
concreto era emendar setores: hoje se usa um por alvo, e vários têm dezenas
disponíveis.

Foi implementado — download multi-setor com normalização por setor, achatamento
que respeita buracos, busca em dois estágios. E **não funcionou para o caso que
motivava tudo.**

Teste em π Mensae c, o trânsito raso de 321 ppm:

| | pontos | baseline | período recuperado | erro |
|---|---|---|---|---|
| 1 setor | 18.264 | 27,9 d | 6,27417 | **0,102%** |
| 4 setores | 60.753 | 298,6 d | 8,12444 | **29,6%** |

Triplicar os pontos e decuplicar a baseline **piorou** a detecção.

### O diagnóstico, que refutou a explicação óbvia

A suspeita natural era resolução: com 298 dias há ~48 ciclos, e um erro de
período vira deriva de fase acumulada. A grade do lote tem passo de ~0,05 d
perto de 6 d, longe do que a baseline exige.

Só que buscar com grade densa e estreita em volta do valor publicado devolveu
período 6,32 com pico 0,049 × 10⁻³ — **mais fraco** que o pico espúrio em 8,12,
que vale 0,054. Procurando no lugar certo, com resolução de sobra, o sinal
verdadeiro perde.

Não é resolução. **É que a emenda soma sistemática junto com sinal.** Cada setor
traz sua própria deriva instrumental; o achatamento por segmento reduz, não
elimina; e o que sobra, na casa de 0,1%, domina um trânsito de 0,03%. A curva
achatada tem mínimo em 0,992 — uma queda de 0,8%, vinte e cinco vezes mais funda
que o trânsito procurado.

### O que fica

Emendar setores **não é ganho automático**, e essa era a premissa. Para sinal
raso, mais baseline pode custar mais do que rende, e o ganho de S/R é aparente:
a S/R subiu de 27,9 para 74,4 medindo um sinal que não é o planeta.

O caminho não é mais grade nem mais setores: é **achatamento melhor antes da
emenda** — remover a sistemática de cada setor com um método que a descreva, e
não só uma mediana móvel. Enquanto isso não existir, um setor por alvo continua
sendo a escolha honesta.

O que sobrou de aproveitável, e é real: o refino em dois estágios melhorou a
precisão de um setor de 0,35% para 0,102%, e o achatamento passou a respeitar
buracos — que a curva de um setor só também tem, por causa da pausa de downlink
no meio.

## Achatamento com máscara — 02/09/2026: funcionou, e resgatou uma feature

O diagnóstico do multi-setor apontava achatamento melhor. Duas mudanças foram
testadas, e **só uma sobreviveu à medição.**

### Biweight de Tukey: medido pior, removido

A literatura de busca de trânsitos aponta o biweight como melhor estimador de
tendência que a mediana. Aqui não foi:

| estimador | erro no período | pico |
|---|---|---|
| mediana | **0,102%** | 0,0338 × 10⁻³ |
| biweight | 10,594% | 0,0078 × 10⁻³ |

Quatro vezes menos pico. Removido — e o registro fica para ninguém tentar de
novo sem medir.

### Mascarar o trânsito ao ajustar a base: funcionou

O achatamento incluía os pontos do próprio trânsito no cálculo da linha de base,
então a tendência descia junto e **comia parte da profundidade**. A análise
passou a ter dois passes: o primeiro acha um candidato, o segundo refaz a base
ignorando onde esse candidato está.

Em π Mensae c, um setor:

| | pico | profundidade medida |
|---|---|---|
| passe único | 0,0338 × 10⁻³ | 0,0240% |
| com máscara | **0,0399 × 10⁻³** | **0,0283%** |
| publicado | — | 0,0321% |

O achatamento estava apagando cerca de um quarto da profundidade. A máscara
recupera a maior parte, e a medida fica mais perto do valor publicado.

### O efeito colateral que importa mais

`odd-even` tinha sido declarado imprestável no treino anterior — separava 58,9%
e **invertia de direção** sob controle de S/R, assinatura de ruído. Com o dado
preparado direito:

| | antes | agora |
|---|---|---|
| separação (todos) | 58,9% | **66,0%** |
| separação (limpo) | 58,7% | **70,0%** |
| direção sob controle de S/R | invertia | consistente |

**A feature não era ruim; a preparação do dado é que a estragava.** Conclusão
que vale além dela: antes de descartar uma medida, vale checar o que vem antes
dela no caminho.

### Terceiro treino

| conjunto | melhor feature isolada | regressão | árvores |
|---|---|---|---|
| todos (262) | **forma, 68,1%** | 62,5% | 65,3% |
| S/R > 15 (184) | **forma, 73,6%** | 73,3% | 69,9% |

`forma` passou a ser a feature mais forte, à frente de profundidade — e é a
fisicamente motivada, a que mede formato e não amplitude. Os pesos da regressão
também ficaram sãos: antes profundidade valia +0,97 contra pico em −0,45, sinal
de colinearidade; agora o maior é forma com +0,385, sem o cabo de guerra.

O modelo continua sem bater a melhor feature isolada. Terceira medição, mesma
resposta: **o gargalo é o tamanho da amostra.**

## Quarto treino — 02/09/2026: o primeiro ganho real

600 alvos, 300 por classe. E uma correção de método que muda a leitura de tudo
que veio antes.

### A comparação estava torta a meu favor — do lado errado

A "linha de base" escolhia o melhor limiar **nos mesmos dados em que era
medida**, e esse número era comparado com modelos validados de forma cruzada.
A referência via a resposta e os modelos não.

O sintoma apareceu ao dobrar o corpus: a linha de base **caiu** de 74,9% para
71,2%. Não foi o dado piorando — foi o otimismo encolhendo, como encolhe quando
a amostra cresce. O limiar agora é escolhido só na parte de treino de cada
dobra, igual aos outros.

Ou seja: os três treinos anteriores compararam um modelo honesto contra uma
referência que espiava. A conclusão "o modelo não bate a linha de base" era, em
parte, artefato disso.

### O resultado

| conjunto | limiar validado | regressão | **Brenda (árvores)** |
|---|---|---|---|
| todos (600) | 68,8% (±4,4) | 68,5% (±8,2) | **71,2% (±4,2)** |
| S/R > 15 (451) | 72,9% (±4,2) | 72,3% (±4,3) | **76,3% (±4,7)** |

O ganho médio é +2,3 e +3,4 pontos — menor que o desvio entre dobras, o que
sozinho não convenceria. Como as dobras são as mesmas para todos os modelos, a
comparação pareada diz mais:

```
todos (600)     +1,7  +2,5  +3,3  +3,3  +0,8    5/5 dobras
S/R > 15 (451)  +7,7  +3,0  -4,8  +4,9  +6,3    4/5 dobras
```

**Cinco de cinco no conjunto completo.** Ganho pequeno e consistente vale mais
que ganho grande e instável — e o recorte filtrado, com média maior, perde uma
dobra por quase cinco pontos.

Brenda também bate a versão otimista da linha de base (69,3% e 73,8%), então a
vitória não vem só de ter consertado a comparação.

### O que mudou junto, e por isso não dá para atribuir a uma causa só

Três coisas mudaram entre o terceiro treino e este: o corpus dobrou, as classes
ficaram equilibradas (era 112 × 150), e a comparação virou justa. O ganho é
real, mas atribuí-lo a "mais dado" seria chute — as três agem na mesma direção.

`forma` segue como a feature de maior peso (+0,489), à frente de profundidade.

## Curva de aprendizado — 02/09/2026: a pergunta finalmente respondida

"Mais dado ainda ajuda?" atravessou quatro treinos sem resposta limpa, porque
sempre mudava mais de uma coisa por vez. `aprendizado.py` isola a variável:
mesmo corpus, mesmas features, mesma avaliação, só o tamanho muda.

```bash
python3 aprendizado.py --dados dados/resultados.csv
```

| n | limiar validado | Brenda | ganho |
|---|---|---|---|
| 100 | 68,8% ±3,8 | 68,0% ±4,7 | −0,8 |
| 150 | 67,7% ±5,4 | 70,9% ±6,3 | +3,2 |
| 200 | 67,4% ±2,7 | 68,8% ±0,4 | +1,4 |
| 300 | 67,8% ±2,1 | 68,1% ±3,4 | +0,3 |
| 400 | 68,3% ±1,2 | 70,5% ±1,8 | +2,2 |
| 500 | 68,2% ±0,8 | 71,1% ±2,0 | +2,9 |
| 600 | 68,5% ±0,6 | **72,5% ±0,6** | **+4,0** |

Quatro leituras, e a terceira é a que importa para decidir o próximo passo.

**A linha de base é plana.** ~68% em todos os tamanhos. Faz sentido: um limiar
tem um parâmetro só, e um parâmetro não aprende com mais exemplos. Ela não é um
concorrente que melhora — é um piso.

**Brenda sobe, e ainda estava subindo no último passo.** +1,3 ponto de 500 para
600, sem sinal de achatamento. Mais dado continua sendo investimento com
retorno.

**O ganho sobre a base cresce com o tamanho:** −0,8 em cem alvos, +4,0 em
seiscentos. É a assinatura de um modelo que precisa de dado para se expressar —
e é o que reconcilia os treinos anteriores. Em torno de 300 alvos o ganho era
+0,3, exatamente o empate que o terceiro treino mediu. **Aquelas conclusões não
estavam erradas; eram observações corretas de um regime onde o modelo ainda não
conseguia aparecer.**

**O desvio desaba:** ±4,7 em cem alvos, ±0,6 em seiscentos. O resultado de hoje
é muito mais confiável que qualquer um dos anteriores, e não só por ser maior.

A curva tem ruído — n=150 marca +3,2 e n=300 marca +0,3, fora de ordem. Cinco
sorteios por tamanho não eliminam a sorte. A tendência é clara; a monotonia não.

### O teto

A tabela TOI, com os filtros atuais (período < 9 d, tmag < 12), tem 665 planetas
e 719 falsos positivos. Um corpus equilibrado de ~1.300 é o limite sem afrouxar
brilho ou período — e afrouxar brilho troca quantidade por medida pior.

## 1.170 alvos — 02/09/2026: a curva achatou, e a previsão falhou

O corpus quase dobrou de novo: 600 planetas e 570 falsos positivos. Desta vez
foi a classe de falsos positivos que esgotou o estoque da TOI, invertendo o
gargalo do lote anterior — confirmação de que a escassez de antes era o
pré-filtro quebrado, não falta de alvo.

### O resultado

| conjunto | limiar validado | regressão | Brenda |
|---|---|---|---|
| todos (1170) | 69,5% (±2,4) | 68,6% (±3,3) | **72,2% (±1,1)** |
| S/R > 15 (856) | 72,1% (±3,7) | 71,8% (±3,4) | **74,1% (±3,7)** |

Ganho de +2,6 e +2,0 pontos, 4 de 5 dobras nos dois recortes. A vitória se
mantém, e o desvio caiu para ±1,1 — o número é mais confiável que qualquer
anterior.

### A previsão registrada antes da medição estava errada

Antes de disparar o download ficou escrito: *"espero Brenda entre 74% e 76% em
1.200, com o ganho sobre a base entre +5 e +7"*. Saiu **71,5%** de curva e
**+2,8** de ganho. Errado nas duas pontas, e para menos.

O erro veio de extrapolar a inclinação do trecho 500→600 como se ela fosse
continuar. Era o trecho mais íngreme da curva, e trecho íngreme não é tendência.

### A curva estendida

| n | limiar validado | Brenda | ganho |
|---|---|---|---|
| 100 | 65,5% ±7,2 | 66,8% ±3,8 | +1,2 |
| 200 | 65,6% ±2,9 | 65,4% ±2,9 | −0,3 |
| 300 | 68,5% ±2,8 | 68,0% ±2,0 | −0,5 |
| 400 | 66,7% ±1,1 | 69,2% ±1,2 | +2,5 |
| 600 | 67,6% ±1,4 | 69,5% ±1,4 | +1,9 |
| 800 | 68,3% ±1,0 | 71,6% ±1,0 | +3,3 |
| 1000 | 68,7% ±0,4 | 70,8% ±0,8 | +2,2 |
| **1170** | 68,7% ±0,3 | **71,5% ±0,3** | +2,8 |

**Último passo, de 1000 para 1170: +0,7 ponto.** De 600 para 1170, quase
dobrando: +2,0. A curva ainda sobe, mas o retorno por alvo baixado caiu para
perto de zero.

Os pontos desta tabela **não são comparáveis um a um com os da curva anterior**:
lá as subamostras saíam de um corpus de 600, aqui saem de 1.170, então o n=600
daqui é um sorteio diferente daquele corpus específico. Só a forma dentro de uma
mesma execução é comparável.

### O que mudou de verdade

O gargalo saiu do tamanho da amostra. Três medições diziam "mais dado"; esta diz
que mais dado, **desta fonte e com estas features**, acabou de esgotar o que
tinha para dar — e o poço da TOI também está no fim para estes filtros.

O que resta, em ordem de custo:

1. **Feature nova de verdade.** Deslocamento de centroide é o discriminador que
   falta, e exige baixar target pixel files — outra ordem de dado e de trabalho.
2. **Rever o rótulo.** "Falso positivo" da TOI é heterogêneo, e o vazamento
   descrito no primeiro treino continua de pé: a disposição é decidida em parte
   com a mesma fotometria.
3. **Mais dado afrouxando o brilho.** O mais barato e o menos promissor: troca
   quantidade por medida pior, e a curva mostra que quantidade rende pouco agora.

## Centroide — 02/09/2026: a primeira feature que soma

| conjunto | limiar validado | regressão | Brenda |
|---|---|---|---|
| todos (1170) | 69,5% (±2,2) | 70,2% (±2,3) | **76,2% (±2,9)** |
| S/R > 15 (856) | 71,9% (±3,7) | 73,1% (±3,5) | **76,4% (±3,2)** |

Brenda saltou de 72,2% para **76,2%** no conjunto todo — quatro pontos de uma
feature só —, e o ganho sobre a base foi de +2,6 para **+6,7**, vencendo em 5 de
5 dobras.

A direção é a que a física prevê: mediana de **1,485** para planetas contra
**4,146** para falsos positivos. Onde a queda vem de uma vizinha, o centro de luz
se move quase três vezes mais.

### Por que esta funcionou e as outras não

A matriz de correlação de posto entre as features responde:

```
                profundidade    S/R    pico   forma  centroide
profundidade            1,00   0,85    0,97    0,67       0,07
S/R                     0,85   1,00    0,88    0,75       0,10
pico                    0,97   0,88    1,00    0,69       0,15
forma                   0,67   0,75    0,69    1,00       0,00
centroide               0,07   0,10    0,15    0,00       1,00
```

Profundidade e pico correlacionam **0,97** — são a mesma medida com nomes
diferentes. Com S/R junto, formam um bloco que mede uma coisa só: quão forte é a
queda.

**E `forma` não é ortogonal, ao contrário do que ficou escrito aqui.** Ela
correlaciona 0,67 a 0,75 com esse bloco. Era essa a razão de separar bem sozinha
e não somar nada ao modelo — informação que o modelo já tinha, chegando por
outro nome. A afirmação de que ela era "ortogonal por construção" estava errada,
e o número que a derruba é este.

O centroide correlaciona **0,00 a 0,15** com tudo. É a única feature do conjunto
de que dá para dizer, com medida e não com argumento, que traz informação nova —
porque não mede a força do sinal, mede de onde ele vem.

### O que isso ensina para a próxima feature

O critério não é "esta feature separa bem sozinha". `forma` separa 69,5% sozinha
e não acrescenta nada. O critério é **descorrelação com o que já existe**, e ele
é verificável antes de treinar: basta a matriz acima.

### O orçamento estava errado por uma ordem de grandeza

Ficou escrito que esta feature exigiria baixar *target pixel files* — "outra
ordem de dado e de trabalho", dezenas de gigabytes. O centroide já estava nas
colunas `MOM_CENTR1/2` do arquivo de curva do SPOC, nos 2,2 GB de FITS que já
estavam em cache. Custo real de rede: zero.

Vale como lição de estimativa: o custo foi orçado a partir de como a medida é
feita em princípio, e não do que o dado disponível já continha.

## Próximo passo

Mais dado antes de mais modelo. Concretamente: vários setores por alvo, o que
aumenta o número de trânsitos e a S/R de cada medida; e alvos suficientes para o
desvio entre dobras cair abaixo do efeito que se quer medir.
