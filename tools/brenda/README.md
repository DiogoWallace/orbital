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

## Próximo passo

Mais dado antes de mais modelo. Concretamente: vários setores por alvo, o que
aumenta o número de trânsitos e a S/R de cada medida; e alvos suficientes para o
desvio entre dobras cair abaixo do efeito que se quer medir.
