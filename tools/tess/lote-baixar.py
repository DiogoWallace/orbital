#!/usr/bin/env python3
"""
Baixa muitas curvas rotuladas do TESS, para servir de substrato de analise.

Este e o passo que separa "cinco alvos escolhidos a dedo" de um conjunto sobre
o qual se pode medir alguma coisa. A tabela TOI ja traz o rotulo — planeta
confirmado, falso positivo, candidato — e este script transforma isso em curvas
no disco mais um manifesto que amarra cada arquivo ao seu rotulo.

    python3 lote-baixar.py --quantos 60 --saida ~/dados/tess-lote

O que sai:

    <saida>/curvas/tic<TIC>-s<NN>.json    uma por alvo
    <saida>/manifesto.csv                 TIC, rotulo e valores publicados
    <saida>/falhas.csv                    o que nao deu, e por que

TRES DECISOES QUE VALE CONHECER

**O filtro de periodo nao e conveniencia, e correcao.** Um setor dura ~27 dias.
Alvo de periodo longo cabe uma ou duas vezes na janela, e com um ou dois eventos
nao ha periodicidade a estabelecer. O padrao exige ao menos tres eventos.

**As classes saem equilibradas.** Baixar o que a consulta devolver primeiro
produziria um conjunto dominado por uma classe, e uma linha de base medida sobre
conjunto desequilibrado engana: um classificador que responde sempre "falso
positivo" acertaria a maioria sem aprender nada.

**E retomavel.** Curva ja baixada e pulada, falha e registrada e o laco segue.
Baixar dezenas de arquivos de um arquivo publico e uma operacao que vai falhar
no meio alguma vez — e comecar de novo do zero, nao.

Precisa do lightkurve (so para o download; a selecao usa a biblioteca padrao):

    python3 -m venv ~/.venvs/orbital-tess
    source ~/.venvs/orbital-tess/bin/activate
    pip install lightkurve
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

MAST = "https://mast.stsci.edu/vo-tap/api/v0.1/caom/sync"
NEA = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

DURACAO_SETOR_DIAS = 27.0
EVENTOS_MINIMOS = 3

# Planeta de um lado, nao-planeta do outro. PC e APC ficam de fora do
# equilibrio de proposito: sao justamente os casos cujo rotulo ninguem sabe, e
# treinar ou medir contra eles seria medir contra a incerteza.
CLASSES = {
    "planeta": ("CP", "KP"),
    "falso-positivo": ("FP",),
}


def tap(sql: str, endpoint: str, com_lang: bool = True, tempo: int = 120) -> str:
    parametros = {"query": sql, "REQUEST": "doQuery", "format": "csv"}

    if com_lang:
        parametros["LANG"] = "ADQL"

    with urllib.request.urlopen(
        f"{endpoint}?{urllib.parse.urlencode(parametros)}", timeout=tempo
    ) as resposta:
        return resposta.read().decode("utf-8", errors="replace")


def linhas(texto: str) -> list[dict[str, str]]:
    if "QUERY_STATUS" in texto and "ERROR" in texto:
        raise RuntimeError(texto[texto.find('value="ERROR"'):][:300])

    return list(csv.DictReader(io.StringIO(texto)))


def numero(linha: dict[str, str], chave: str) -> float | None:
    try:
        return float((linha.get(chave) or "").strip())
    except ValueError:
        return None


def selecionar(disposicoes: tuple[str, ...], quantos: int, tmag_max: float) -> list[dict]:
    """Candidatos de uma classe, ja filtrados por periodo utilizavel."""
    periodo_max = DURACAO_SETOR_DIAS / EVENTOS_MINIMOS
    lista = "', '".join(disposicoes)

    # Sem ORDER BY: neste servico o TOP e aplicado antes da ordenacao, entao
    # ordenar daria falsa impressao de ranking. Quem faz o recorte e o WHERE.
    sql = f"""
    select top {quantos * 4} tid, toi, tfopwg_disp, pl_orbper, pl_trandurh,
           pl_trandep, pl_rade, st_tmag, st_rad
    from toi
    where tfopwg_disp in ('{lista}')
      and pl_orbper > 0.4 and pl_orbper < {periodo_max:.2f}
      and pl_trandep > 0
      and st_tmag < {tmag_max}
    """

    vistos: set[str] = set()
    saida: list[dict] = []

    for linha in linhas(tap(sql, NEA, com_lang=False)):
        tic = (linha.get("tid") or "").strip()

        if not tic or tic in vistos:
            continue

        if numero(linha, "pl_orbper") is None:
            continue

        vistos.add(tic)
        saida.append(linha)

    return saida


def setor_util(tic: str) -> int | None:
    """O menor setor com cadencia de 2 minutos, ou None se nao houver."""
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

    setores = sorted(por_cadencia.get(120, []))

    return setores[0] if setores else None


def baixar(
    tic: str, setor: int, destino: Path, citacao: str, mascara: str = "default"
) -> dict | None:
    import lightkurve as lk

    busca = lk.search_lightcurve(
        f"TIC {tic}", mission="TESS", author="SPOC", sector=setor, exptime=120
    )

    if len(busca) == 0:
        return None

    curva = busca[0].download(quality_bitmask=mascara, flux_column="pdcsap_flux")
    normalizada = curva.remove_nans().normalize()

    pares = [
        (float(t), float(f))
        for t, f in zip(normalizada.time.value, normalizada.flux.value)
        if t == t and f == f  # descarta NaN sem importar math
    ]
    pares.sort()

    if not pares:
        return None

    t0 = pares[0][0]

    return {
        "schema": "orbital.lightcurve/1",
        "procedencia": {
            "missao": "TESS",
            "instrumento": "TESS Photometer",
            "pipeline": "SPOC",
            "produto": "PDCSAP_FLUX",
            "alvo": f"TIC {tic}",
            "tic": tic,
            "setor": setor,
            "cadenciaSegundos": 120,
            "arquivo": "MAST — Mikulski Archive for Space Telescopes",
            "citacao": citacao,
            # A mascara de qualidade e decisao de processamento, nao ajuste de
            # conveniencia: ela descarta cadencias e muda o dado. Duas curvas do
            # mesmo FITS com mascaras diferentes SAO dados diferentes, e sem
            # este campo nada distingue uma da outra depois (ADR 0014).
            #
            # `hardest` descarta cadencia marcada por qualquer flag e chega a
            # jogar fora 30-38% da serie; `default` e o conjunto que o proprio
            # pipeline SPOC recomenda. A S/R de um transito cresce com a raiz do
            # numero de pontos dentro dele, entao mascara agressiva custa
            # deteccao justamente no caso raso.
            "mascaraQualidade": mascara,
        },
        "pontos": len(pares),
        "tempo": [round(t - t0, 8) for t, _ in pares],
        "fluxo": [round(f, 8) for _, f in pares],
        "tempoInicialBtjd": round(t0, 8),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quantos", type=int, default=30, help="Alvos por classe")
    parser.add_argument("--saida", required=True)
    parser.add_argument("--tmag-max", type=float, default=12.0)
    parser.add_argument("--pausa", type=float, default=1.0, help="Segundos entre downloads")
    parser.add_argument(
        "--mascara",
        default="default",
        choices=["none", "default", "hard", "hardest"],
        help="Mascara de qualidade do lightkurve. Fica gravada na procedencia.",
    )
    parser.add_argument(
        "--so-selecionar",
        action="store_true",
        help="Monta o manifesto sem baixar nada — util para conferir a selecao",
    )
    args = parser.parse_args()

    # Importa a citacao do conversor, para nao existirem duas versoes do texto.
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "baixar_curva", str(Path(__file__).parent / "baixar-curva.py")
    )
    conversor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(conversor)
    citacao = conversor.CITACOES["TESS"]

    raiz = Path(args.saida).expanduser()
    curvas = raiz / "curvas"
    curvas.mkdir(parents=True, exist_ok=True)

    manifesto: list[dict] = []
    falhas: list[dict] = []

    for rotulo, disposicoes in CLASSES.items():
        print(f"\n=== {rotulo} ({'/'.join(disposicoes)})")

        try:
            candidatos = selecionar(disposicoes, args.quantos, args.tmag_max)
        except Exception as erro:  # noqa: BLE001
            print(f"  selecao falhou: {erro}")
            continue

        print(f"  {len(candidatos)} candidatos com periodo utilizavel")

        aceitos = 0

        for linha in candidatos:
            if aceitos >= args.quantos:
                break

            tic = linha["tid"].strip()

            try:
                setor = setor_util(tic)
            except Exception as erro:  # noqa: BLE001
                falhas.append({"tic": tic, "etapa": "setor", "motivo": str(erro)[:120]})
                continue

            if setor is None:
                falhas.append({"tic": tic, "etapa": "setor", "motivo": "sem cadencia de 2 min"})
                continue

            arquivo = curvas / f"tic{tic}-s{setor:02d}.json"

            registro = {
                "tic": tic,
                "toi": (linha.get("toi") or "").strip('"'),
                "rotulo": rotulo,
                "disposicao": linha.get("tfopwg_disp"),
                "setor": setor,
                "periodo_publicado": linha.get("pl_orbper"),
                "duracao_publicada_h": linha.get("pl_trandurh"),
                "profundidade_publicada_ppm": linha.get("pl_trandep"),
                "raio_publicado_re": linha.get("pl_rade"),
                "tmag": linha.get("st_tmag"),
                "arquivo": arquivo.name,
            }

            if args.so_selecionar:
                manifesto.append(registro)
                aceitos += 1
                continue

            if arquivo.exists():
                print(f"  {tic} s{setor:02d} — ja existe")
                manifesto.append(registro)
                aceitos += 1
                continue

            try:
                documento = baixar(tic, setor, arquivo, citacao, args.mascara)
            except Exception as erro:  # noqa: BLE001
                falhas.append({"tic": tic, "etapa": "download", "motivo": str(erro)[:120]})
                print(f"  {tic} s{setor:02d} — FALHOU: {str(erro)[:60]}")
                continue

            if documento is None:
                falhas.append({"tic": tic, "etapa": "download", "motivo": "produto vazio"})
                continue

            arquivo.write_text(json.dumps(documento, ensure_ascii=False), encoding="utf-8")
            manifesto.append(registro)
            aceitos += 1

            print(f"  {tic} s{setor:02d} — {documento['pontos']} pontos")
            time.sleep(args.pausa)

        print(f"  {aceitos} de {args.quantos} aceitos")

    if manifesto:
        with (raiz / "manifesto.csv").open("w", newline="", encoding="utf-8") as saida:
            escritor = csv.DictWriter(saida, fieldnames=list(manifesto[0]))
            escritor.writeheader()
            escritor.writerows(manifesto)

    if falhas:
        with (raiz / "falhas.csv").open("w", newline="", encoding="utf-8") as saida:
            escritor = csv.DictWriter(saida, fieldnames=list(falhas[0]))
            escritor.writeheader()
            escritor.writerows(falhas)

    print(f"\nmanifesto: {len(manifesto)} linhas · falhas: {len(falhas)}")

    contagem: dict[str, int] = defaultdict(int)
    for registro in manifesto:
        contagem[registro["rotulo"]] += 1

    for rotulo, quantos in sorted(contagem.items()):
        print(f"  {rotulo}: {quantos}")

    sys.exit(0 if manifesto else 1)


if __name__ == "__main__":
    main()
