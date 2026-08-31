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
consultar-alvos.sh  →  escolher TIC  →  baixar-curva.py (sem setor)  →  escolher setor
                                                  ↓
                                        baixar-curva.py --setor N  →  JSON
```

## 1. Escolher os candidatos

```bash
bash consultar-alvos.sh ./candidatos
```

Só precisa de `curl`. Grava três CSVs a partir da tabela TOI do NASA Exoplanet
Archive, por TAP: planeta fundo, planeta raso e falso positivo.

Verificado em 31/08/2026 — a execução trouxe 53, 60 e 11 linhas.

## 2. Achar o setor

**A coluna `sectors` da TOI vem vazia.** Testada em 40 linhas, zero preenchidas.
O setor sai do próprio arquivo:

```bash
python baixar-curva.py --tic 69679391
```

Sem `--setor`, o script lista o que existe e sai.

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
