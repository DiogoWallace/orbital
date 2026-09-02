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
