# Alvos reais do TESS

Ferramentas para sair das cinco curvas sintéticas (`SIN-1`…`SIN-5`) do módulo
`transit-explorer` e chegar a cinco alvos reais, com procedência.

**Isto é versionado mas não é deployado.** Ler FITS exige uma pilha Python que
não tem por que entrar na imagem de produção, e a conversão acontece uma vez por
alvo, na máquina de quem ingere. Nenhum `Dockerfile` copia `tools/` — os três
copiam apenas `apps/api/`, `apps/web/` e `docker/` —, e `tools` está no
`.dockerignore` para nem chegar ao contexto de build.

Versionar aqui, e não em `~/scripts/`, é exigência do
[ADR 0014](../../docs/adr/0014-reprodutibilidade-de-uma-analise.md): se a
ferramenta que produziu o dado vive só na máquina de uma pessoa, a cadeia de
reprodutibilidade tem um elo que ninguém mais consegue refazer.

```bash
cd tools/tess
```

```
consultar-alvos.sh   ┐
                     ├→  escolher TIC  →  resolver-setores.py  →  escolher setor
alvos-sem-toi.py     ┘                                                  ↓
                                                    baixar-curva.py --setor N  →  JSON
                                                                        ↓
                                              php artisan datasets:import <json>
```

`consultar-alvos.sh` dá os três casos de trânsito; `alvos-sem-toi.py` dá os dois
que a TOI não conhece.

Os dois primeiros passos não precisam de instalação nenhuma — `curl` e a
biblioteca padrão do Python bastam. Só o último exige `lightkurve`.

## 1. Escolher os candidatos

```bash
bash consultar-alvos.sh ./candidatos
```

Só precisa de `curl`. Grava três CSVs a partir da tabela TOI do NASA Exoplanet
Archive, por TAP: planeta fundo, planeta raso e falso positivo.

Verificado em 31/08/2026 — a execução trouxe 53, 60 e 11 linhas.

## 2. Achar o setor — e conferir se o alvo presta

**A coluna `sectors` da TOI vem vazia.** Testada em 40 linhas, zero preenchidas.
O setor sai do arquivo, e para isso não é preciso instalar nada:

```bash
python3 resolver-setores.py 256364928 --periodo 2.2186
```

Só biblioteca padrão. Consulta o TAP do MAST e agrupa os setores por cadência:

```
### TIC 256364928
    20s:  3 setores [41, 54, 81]
   120s:  4 setores [14, 41, 54, 81]  <- 2 min

  ~12.2 eventos por setor, com periodo de 2.2186 d
```

**O `--periodo` é a parte que mais importa.** Um setor dura ~27 dias; um alvo de
período longo cabe uma ou duas vezes nessa janela, e com um ou dois eventos não
há periodicidade a estabelecer — o BLS precisa de repetição. O script avisa e
sai com código 1 quando cabem menos de três eventos.

Esse aviso existe porque o erro foi cometido: a primeira lista de candidatos
recomendou um alvo de 16,9 dias de período, escolhido por profundidade e brilho,
que renderia ~1,6 eclipses por setor. Profundidade e magnitude não bastam.

Também aceita vários TIC de uma vez:

```bash
python3 resolver-setores.py 256364928 261136679 285524410
```

## 2b. Os dois casos que a TOI não sabe dar

A TOI lista objetos de interesse para trânsito. A **estrela variável** e a
**curva sem nada** não estão lá — e são justamente os dois casos que ensinam a
duvidar. Também sem instalar nada:

```bash
python3 alvos-sem-toi.py variavel
python3 alvos-sem-toi.py quieta --brilho 8 10 --min-setores 3
python3 alvos-sem-toi.py --tipo "RR*" --brilho 9 12
```

Cruza três serviços: o SIMBAD diz o tipo do objeto, o MAST diz se há curva de
2 minutos, e o NASA Exoplanet Archive confirma que o alvo **não** aparece na
TOI.

Duas lições estão embutidas nos padrões, e ambas custaram uma busca inútil:

- **Brilho demais não presta.** A primeira tentativa devolveu Vega, Altair,
  Spica e Polaris — V entre 0,03 e 3,1. O TESS satura nessas. A faixa padrão
  começa em V 7,5.
- **delta Scuti pulsa rápido demais**, entre 0,02 e 0,3 dia — *abaixo* do piso
  de busca do módulo (0,5 d). O BLS acharia um alias, não a pulsação. O preset
  `variavel` procura **gamma Doradus**, que pulsa entre 0,3 e 3 dias, dentro da
  faixa varrida.

E o que ele **não** prova: que a estrela quieta está mesmo quieta. Ausência de
TOI e tipo genérico no SIMBAD são indícios; só olhando a curva se confirma.

## 3. Baixar e converter

```bash
python3 -m venv ~/.venvs/orbital-tess
source ~/.venvs/orbital-tess/bin/activate
pip install lightkurve

python baixar-curva.py --tic 69679391 --setor 14 --rotulo transito-fundo --saida ./curvas
```

Baixa o produto SPOC, usa `PDCSAP_FLUX` (já corrigido de sistemáticas), descarta
os pontos marcados como ruins, normaliza em torno de 1, e grava a curva **com a
procedência no mesmo arquivo**.

Nem todo alvo tem cadência de 2 min. Se vier vazio, tente `--cadencia 200` ou
`--cadencia 1800`.

Para um objeto sem TOI — a estrela variável — use o nome em vez do TIC:

```bash
python baixar-curva.py --alvo "<nome do objeto>"
```

---

## Três armadilhas encontradas ao escrever isto

**`TOP` é aplicado antes de `ORDER BY`.** Ordenar por profundidade não devolve as
mais profundas: devolve as primeiras que casam com o `WHERE`, ordenadas entre si.
As consultas aqui não ordenam — quem faz o recorte é o `WHERE`, e o resultado é
uma amostra, não um ranking. Se quiser as extremas de verdade, aperte o `WHERE`.

**O serviço dá timeout intermitente**, sem erro útil. Cada consulta tenta três
vezes; na primeira execução real, duas das três precisaram repetir. Uma consulta
que falhe não derruba as outras.

**Há linhas com valores ausentes.** `pl_orbper` vazio aparece no CSV de falso
positivo, por exemplo. Confira antes de adotar um alvo — um período em branco
inviabiliza a comparação que justifica escolhê-lo.

**O TAP do MAST exige `LANG=ADQL`.** Sem esse parâmetro ele responde
`Error in query lang: Field required`, que não sugere a solução. E a tabela a
usar é `ivoa.obscore`, a padronizada da IVOA: `dbo.caomobservation` existe, mas
com outro conjunto de nomes de coluna. Não há coluna de setor — ele vem embutido
no `obs_id`, no trecho `-sNNNN-`.

## Linha de base — 02/09/2026

Primeira medição sobre um conjunto rotulado: **262 curvas** (112 planetas
confirmados, 150 falsos positivos), um setor por alvo, cadência de 2 min,
máscara `default`. A análise inteira levou 94 s.

**Recuperação de período: ~80% dentro de 1%** do valor publicado, nas duas
classes (já contando harmônicas — metade, um e o dobro).

**Separação entre planeta e falso positivo**, por acurácia balanceada com o
melhor limiar único de cada feature. 50% é acaso:

| feature | todos (262) | período <1% (208) | período <1% e S/R>15 (148) |
|---|---|---|---|
| profundidade | 66,5% | 70,5% | **75,7%** |
| altura do pico | 65,7% | 68,6% | 72,3% |
| relação sinal/ruído | 64,0% | 65,0% | 67,7% |
| odd-even | 58,9% | 60,4% | 58,7% |
| secundário | 54,9% | 58,4% | 57,3% |

### O que isso diz

**Nenhuma feature simples separa bem.** A melhor chega a 75,7% no subconjunto
mais limpo — melhor que acaso, longe de resolver. Há espaço real para um modelo
que combine as features; não é um problema já resolvido por um limiar.

**Boa parte da dificuldade era medição, não sobreposição.** Filtrar para alvos
cujo período foi recuperado sobe a melhor feature de 66,5% para 70,5%, e exigir
S/R mínima leva a 75,7%. Nove pontos vieram só de parar de medir lixo: feature
calculada sobre período errado não descreve nada.

**A implicação para o modelo:** treinar sobre tudo é treinar sobre 20% de ruído
rotulado como se fosse sinal. Ou se filtra por qualidade da detecção, ou a
qualidade entra como entrada — mas ignorá-la desperdiça o que este número
mostra.

**`odd-even` não se sustentou.** Ele inverte de direção quando se controla por
S/R, o que é assinatura de feature dominada por ruído. Como está implementado,
não serve.

### Ressalvas

O conjunto ficou desequilibrado (112 × 150) porque o filtro de período esgotou o
estoque de planetas confirmados. "Falso positivo" é heterogêneo — é tudo que foi
rejeitado, não só binária eclipsante. E há **vazamento de rótulo**: a disposição
da TOI é decidida em parte com a mesma fotometria, então S/R correlaciona com
"foi confirmável", não só com "é planeta".

## O que precisa estar anotado no fim

Para cada um dos cinco, saído do CSV e não da memória:

| Campo | Coluna |
|---|---|
| TIC | `tid` |
| Disposição | `tfopwg_disp` |
| Período publicado | `pl_orbper` (dias) |
| Duração publicada | `pl_trandurh` (horas) |
| Profundidade publicada | `pl_trandep` (ppm — 10 000 ppm = 1%) |
| Raio do planeta | `pl_rade` (raios terrestres) |
| Setor | do `baixar-curva.py`, não da TOI |
| Data da consulta | o dia em que você rodou |

São a **referência** contra a qual a análise do Orbital vai ser comparada. É o
que transforma "meu código achou 3,47 dias" em "meu código achou 3,47 dias e o
valor publicado é 3,4741012".

## A pendência que o script não resolve

O campo `citacao` do JSON sai preenchido com `PREENCHER`. Os termos de
reconhecimento do MAST e da missão precisam ser lidos na fonte e escritos ali à
mão — inventar uma frase de citação seria exatamente o tipo de procedência falsa
que o resto disto existe para evitar.

Ver o [ADR 0014](../../docs/adr/0014-reprodutibilidade-de-uma-analise.md) para o
porquê de cada campo da procedência.
