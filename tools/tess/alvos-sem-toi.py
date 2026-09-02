#!/usr/bin/env python3
"""
Encontra os alvos que a tabela TOI nao sabe dar — sem instalar nada.

A TOI lista objetos de interesse para transito. Dois dos cinco casos que o
modulo `transit-explorer` ensina nao estao la, e sao justamente os que ensinam
a duvidar:

    variavel  uma estrela que pulsa: periodicidade real, transito nenhum
    quieta    uma estrela sem nada, para calibrar o que "nada" parece

Este script cruza tres servicos, todos por TAP e todos com a biblioteca padrao:
o SIMBAD diz o tipo do objeto, o MAST diz se ha curva de 2 minutos, e o
NASA Exoplanet Archive confirma que o alvo **nao** aparece na TOI.

Uso:

    python3 alvos-sem-toi.py variavel
    python3 alvos-sem-toi.py quieta --brilho 8 10 --min-setores 3
    python3 alvos-sem-toi.py --tipo RR* --brilho 9 11

DUAS LICOES QUE ESTAO EMBUTIDAS NOS PADROES

1. **Brilho demais nao presta.** A primeira busca por variaveis brilhantes
   devolveu Vega, Altair, Spica e Polaris — V entre 0,03 e 3,1. O TESS satura
   nessas, e curva saturada nao serve de exemplo. Por isso a faixa padrao
   comeca em V 7,5.

2. **delta Scuti pulsa rapido demais.** O periodo tipico fica entre 0,02 e 0,3
   dia, *abaixo* do piso de busca do modulo (0,5 d): o BLS acharia um alias, e
   nao a pulsacao. Gamma Doradus pulsa entre 0,3 e 3 dias, dentro da faixa
   varrida — e por isso o preset `variavel` procura gD*, nao dS*.

O QUE ESTE SCRIPT **NAO** PROVA

Que a estrela quieta esta mesmo quieta. Ausencia de TOI e classificacao
generica no SIMBAD sao indicios, nao demonstracao: so olhando a curva se
confirma. Se ela tiver variacao sutil, vira um caso melhor ainda — so que
outro, e com outro rotulo.

A funcao de consulta TAP aparece tambem em `resolver-setores.py`. A duplicacao
e deliberada: cada script destes precisa rodar sozinho, copiado para qualquer
lugar, sem carregar um pacote junto.
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

SIMBAD = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync"
MAST = "https://mast.stsci.edu/vo-tap/api/v0.1/caom/sync"
NEA = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

PRESETS = {
    # gD*: pulsacao de 0,3 a 3 dias — dentro da faixa que o BLS varre.
    "variavel": ("gD*", 7.5, 10.5),
    # '*' e a classificacao generica de estrela no SIMBAD: sem tipo variavel.
    "quieta": ("*", 8.0, 10.0),
}


def tap(sql: str, endpoint: str, com_lang: bool = True, tempo: int = 120) -> str:
    parametros = {"query": sql, "REQUEST": "doQuery", "format": "csv"}

    # O TAP do MAST e o do SIMBAD exigem LANG=ADQL; o do NASA Exoplanet
    # Archive rejeita o parametro. A diferenca nao esta documentada em lugar
    # nenhum obvio — foi descoberta tentando.
    if com_lang:
        parametros["LANG"] = "ADQL"

    endereco = f"{endpoint}?{urllib.parse.urlencode(parametros)}"

    with urllib.request.urlopen(endereco, timeout=tempo) as resposta:
        return resposta.read().decode("utf-8", errors="replace")


def linhas(texto: str) -> list[dict[str, str]]:
    if "QUERY_STATUS" in texto and "ERROR" in texto:
        raise RuntimeError(texto[texto.find('value="ERROR"'):][:300])

    return list(csv.DictReader(io.StringIO(texto)))


def setores_de(tic: str) -> dict[int, set[int]]:
    sql = (
        "select distinct obs_id, t_exptime from ivoa.obscore "
        "where obs_collection = 'TESS' and dataproduct_type = 'timeseries' "
        f"and target_name = '{tic}'"
    )

    por_cadencia: dict[int, set[int]] = defaultdict(set)

    for linha in linhas(tap(sql, MAST)):
        achado = re.search(r"-s(\d{4})-", linha.get("obs_id") or "")

        try:
            cadencia = int(float(linha.get("t_exptime") or 0))
        except ValueError:
            continue

        if achado:
            por_cadencia[cadencia].add(int(achado.group(1)))

    return por_cadencia


def aparece_na_toi(tic: str) -> bool:
    return len(linhas(tap(f"select tid from toi where tid = {tic}", NEA, com_lang=False))) > 0


def candidatos_simbad(otype: str, minimo: float, maximo: float, limite: int) -> list[dict[str, str]]:
    sql = f"""
    select top {limite} b.main_id, b.otype, f.V, id.id as tic
    from basic as b
    join ident as id on b.oid = id.oidref
    left join allfluxes as f on b.oid = f.oidref
    where id.id like 'TIC %'
      and b.otype = '{otype}'
      and f.V between {minimo} and {maximo}
    """

    return linhas(tap(sql, SIMBAD))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("caso", nargs="?", choices=sorted(PRESETS), help="Preset de busca")
    parser.add_argument("--tipo", help="otype do SIMBAD, sobrepondo o preset")
    parser.add_argument(
        "--brilho",
        nargs=2,
        type=float,
        metavar=("MIN", "MAX"),
        help="Faixa de magnitude V",
    )
    parser.add_argument("--min-setores", type=int, default=2)
    parser.add_argument("--quantos", type=int, default=6, help="Quantos exibir")
    parser.add_argument("--examinar", type=int, default=60, help="Quantos candidatos avaliar")
    args = parser.parse_args()

    if not args.caso and not args.tipo:
        parser.error("informe um preset (variavel, quieta) ou --tipo")

    otype, minimo, maximo = PRESETS.get(args.caso or "", (args.tipo, 7.5, 10.5))
    otype = args.tipo or otype

    if args.brilho:
        minimo, maximo = args.brilho

    print(f"tipo {otype} · V entre {minimo} e {maximo} · mínimo {args.min_setores} setores\n")

    try:
        brutos = candidatos_simbad(otype, minimo, maximo, args.examinar)
    except Exception as erro:  # noqa: BLE001
        print(f"SIMBAD falhou: {erro}")
        sys.exit(1)

    print(f"({len(brutos)} candidatos brutos do SIMBAD, cruzando com MAST e TOI...)\n")

    vistos: set[str] = set()
    achados = 0

    for linha in brutos:
        tic = (linha.get("tic") or "").replace("TIC ", "").strip()

        if not tic or tic in vistos:
            continue

        vistos.add(tic)

        try:
            setores = sorted(setores_de(tic).get(120, []))
        except Exception:  # noqa: BLE001 — alvo sem dado nao e erro do script
            continue

        if len(setores) < args.min_setores:
            continue

        try:
            if aparece_na_toi(tic):
                continue
        except Exception:  # noqa: BLE001
            continue

        magnitude = linha.get("V") or ""
        try:
            magnitude = f"{float(magnitude):.2f}"
        except ValueError:
            magnitude = "—"

        print(
            f"  {(linha.get('main_id') or '')[:20]:<21} {(linha.get('otype') or ''):<4} "
            f"V={magnitude:>5}  TIC {tic:<11} {len(setores):>2} setores: {setores[:8]}"
        )

        achados += 1

        if achados >= args.quantos:
            break

    if not achados:
        print("  nenhum candidato passou nos filtros — alargue a faixa de brilho")
        sys.exit(1)

    if args.caso == "quieta":
        print(
            "\n  Lembre: ausência de TOI e tipo genérico são indícios, não prova.\n"
            "  Só olhando a curva se confirma que não há nada nela."
        )


if __name__ == "__main__":
    main()
