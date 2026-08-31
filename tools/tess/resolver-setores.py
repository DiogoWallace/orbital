#!/usr/bin/env python3
"""
Descobre em quais setores do TESS um alvo foi observado — sem instalar nada.

Usa so a biblioteca padrao. Nasceu porque `python3-venv` nao estava disponivel
e o `lightkurve` nao podia ser instalado, mas ficou porque e util por si:
resolver setor e uma pergunta de catalogo, e nao precisa de uma pilha
cientifica inteira para ser respondida.

Uso:

    python resolver-setores.py 256364928
    python resolver-setores.py 256364928 --periodo 2.2186
    python resolver-setores.py 256364928 261136679 285524410

Com `--periodo`, o script tambem estima quantos eventos cabem em um setor. Essa
conta e o motivo principal de o script existir — veja ARMADILHA, abaixo.

ARMADILHA
    Um setor do TESS dura cerca de 27 dias. Um alvo de periodo longo cabe uma
    ou duas vezes nessa janela, e com um ou dois eventos nao ha periodicidade a
    estabelecer: o BLS precisa de repeticao. Escolher alvo por profundidade e
    brilho, sem olhar quantos eventos cabem no setor, e um erro facil — foi
    cometido ao montar a primeira lista de candidatos deste projeto.

COMO A CONSULTA FOI DESCOBERTA
    O servico e o TAP do MAST, sobre a tabela `ivoa.obscore` — a padronizada da
    IVOA, cujos nomes de coluna sao estaveis. A tabela `dbo.caomobservation`
    existe tambem, mas usa outro conjunto de nomes e rejeitou os padroes.

    Dois detalhes custaram tentativa:

      1. O parametro `LANG=ADQL` e obrigatorio. Sem ele o servico responde
         "Error in query lang: Field required", que nao sugere a solucao.
      2. Nao ha coluna de setor. Ele vem embutido no `obs_id`, no trecho
         `-sNNNN-`, e e de la que este script o extrai.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

TAP = "https://mast.stsci.edu/vo-tap/api/v0.1/caom/sync"

DURACAO_SETOR_DIAS = 27.0


def consultar(sql: str, tempo_limite: int = 120) -> str:
    parametros = urllib.parse.urlencode(
        {"query": sql, "LANG": "ADQL", "REQUEST": "doQuery", "format": "csv"}
    )

    with urllib.request.urlopen(f"{TAP}?{parametros}", timeout=tempo_limite) as resposta:
        return resposta.read().decode("utf-8", errors="replace")


def setores_de(tic: str) -> dict[int, set[int]]:
    """Setores observados, agrupados por cadencia em segundos."""
    sql = (
        "select distinct obs_id, t_exptime from ivoa.obscore "
        "where obs_collection = 'TESS' and dataproduct_type = 'timeseries' "
        f"and target_name = '{tic}'"
    )

    bruto = consultar(sql)

    if "QUERY_STATUS" in bruto and "ERROR" in bruto:
        raise RuntimeError(bruto[bruto.find('value="ERROR"') :][:400])

    por_cadencia: dict[int, set[int]] = defaultdict(set)

    for linha in csv.DictReader(io.StringIO(bruto)):
        achado = re.search(r"-s(\d{4})-", linha.get("obs_id") or "")

        if not achado:
            continue

        try:
            cadencia = int(float(linha.get("t_exptime") or 0))
        except ValueError:
            continue

        por_cadencia[cadencia].add(int(achado.group(1)))

    return por_cadencia


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tics", nargs="+", help="Um ou mais identificadores TIC, so o numero")
    parser.add_argument(
        "--periodo",
        type=float,
        default=None,
        help="Periodo em dias; estima quantos eventos cabem em um setor",
    )
    args = parser.parse_args()

    problemas = 0

    for tic in args.tics:
        print(f"\n### TIC {tic}")

        try:
            por_cadencia = setores_de(tic)
        except Exception as erro:  # noqa: BLE001 — a mensagem do servico e o que importa
            print(f"  falhou: {erro}")
            problemas += 1
            continue

        if not por_cadencia:
            print("  nenhuma serie temporal encontrada")
            problemas += 1
            continue

        for cadencia in sorted(por_cadencia):
            setores = sorted(por_cadencia[cadencia])
            marca = "  <- 2 min" if cadencia == 120 else ""
            print(f"  {cadencia:>4}s: {len(setores):>2} setores {setores}{marca}")

        if args.periodo:
            eventos = DURACAO_SETOR_DIAS / args.periodo
            print(f"\n  ~{eventos:.1f} eventos por setor, com periodo de {args.periodo} d")

            if eventos < 3:
                print("  AVISO: poucos eventos em um setor. O BLS precisa de repeticao")
                print("         para estabelecer periodicidade — considere outro alvo,")
                print("         ou junte setores consecutivos.")
                problemas += 1

    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
