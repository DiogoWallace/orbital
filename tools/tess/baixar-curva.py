#!/usr/bin/env python3
"""
Baixa uma curva de luz do TESS e converte para o JSON que o Orbital consome.

Este script roda **fora** da aplicacao, de proposito. Ler FITS exige uma pilha
Python que nao tem por que entrar no deployable de producao, e a conversao
acontece uma vez por alvo. O repositorio versiona o JSON resultante; o Python
fica aqui.

Uso:

    python baixar-curva.py --tic 261136679 --setor 1 --saida ./curvas

O que sai:

    curvas/tic261136679-s01.json

O JSON carrega a curva e a procedencia junto, porque o ADR 0014 exige os dois
no mesmo lugar: dado sem procedencia ao lado e uma divida esperando vencer.

Instalacao, em um venv descartavel (nunca no repositorio):

    python3 -m venv ~/.venvs/orbital-tess
    source ~/.venvs/orbital-tess/bin/activate
    pip install lightkurve
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path


# Texto de reconhecimento exigido por missao, copiado palavra por palavra de
#
#     https://archive.stsci.edu/publishing/mission-acknowledgements
#     https://archive.stsci.edu/footer/data-attributions/mission-acknowledgements
#
# conferido nas duas paginas em 01/09/2026. Missao sem entrada aqui continua
# saindo com PREENCHER: e melhor um dataset que se declara nao-citavel do que um
# com uma frase de citacao que ninguem verificou.
CITACOES = {
    "TESS": (
        "This paper includes data collected with the TESS mission, obtained from "
        "the MAST data archive at the Space Telescope Science Institute (STScI). "
        "Funding for US Institutions for the TESS mission is provided by the NASA "
        "Explorer Program. STScI is operated by the Association of Universities "
        "for Research in Astronomy, Inc., under NASA contract NAS5-26555."
    ),
}


def somar_arquivo(caminho: Path) -> str:
    """SHA-256 do FITS de origem.

    E o elo que permite dizer, anos depois, que a analise rodou sobre *este*
    arquivo. Se a missao reprocessar e republicar, a soma muda e o dataset
    passa a ser outro — nao uma atualizacao do mesmo.
    """
    digest = hashlib.sha256()

    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            digest.update(bloco)

    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tic", help="Identificador TIC, so o numero")
    parser.add_argument(
        "--alvo",
        help="Nome resolvivel do objeto, para casos que nao tem TOI (uma variavel, por exemplo)",
    )
    parser.add_argument(
        "--setor",
        type=int,
        default=None,
        help="Sem isto, o script apenas lista os setores disponiveis e sai",
    )
    parser.add_argument("--saida", default="./curvas")
    parser.add_argument(
        "--cadencia",
        type=int,
        default=120,
        help="Tempo de exposicao em segundos: 120 e a cadencia de 2 minutos",
    )
    parser.add_argument(
        "--mascara",
        default="default",
        choices=["none", "default", "hard", "hardest"],
        help="Mascara de qualidade do lightkurve. Fica gravada na procedencia.",
    )
    parser.add_argument(
        "--rotulo",
        default=None,
        help="Nome curto do caso, por exemplo 'transito-raso'",
    )
    args = parser.parse_args()

    if not args.tic and not args.alvo:
        raise SystemExit("informe --tic ou --alvo.")

    import lightkurve as lk

    alvo = args.alvo or f"TIC {args.tic}"

    # Sem setor, o script vira um catalogo do que existe. A coluna `sectors` da
    # tabela TOI veio vazia em todas as linhas testadas em 31/08/2026, entao
    # esta e a fonte confiavel do setor — o proprio arquivo.
    if args.setor is None:
        print(f"setores disponiveis para {alvo} (SPOC):\n")
        disponiveis = lk.search_lightcurve(alvo, mission="TESS", author="SPOC")

        if len(disponiveis) == 0:
            raise SystemExit(
                f"nenhum produto SPOC para {alvo}.\n"
                "Nem todo alvo tem: verifique o nome, ou tente sem author=SPOC "
                "para ver o que existe de outros pipelines."
            )

        print(disponiveis)
        print("\nEscolha um e rode de novo com --setor <n>.")
        return

    print(f"procurando {alvo}, setor {args.setor}...")

    busca = lk.search_lightcurve(
        alvo,
        mission="TESS",
        author="SPOC",
        sector=args.setor,
        exptime=args.cadencia,
    )

    if len(busca) == 0:
        raise SystemExit(
            f"nada encontrado para {alvo} no setor {args.setor} com exptime={args.cadencia}.\n"
            "Rode sem --setor para ver o que existe. Nem todo alvo tem cadencia\n"
            "de 2 min — alguns so tem 200s ou 1800s."
        )

    # `quality_bitmask="hardest"` descarta os pontos que o pipeline marcou como
    # suspeitos. Para busca de transito isso e o certo: um artefato deixado na
    # curva vira um "transito" convincente.
    curva = busca[0].download(quality_bitmask=args.mascara, flux_column="pdcsap_flux")

    caminho_fits = Path(busca[0].table["productFilename"][0])
    arquivo_local = Path(curva.meta.get("FILENAME", "")) if curva.meta.get("FILENAME") else None

    # PDCSAP ja vem corrigido de sistematicas do instrumento. Normalizar deixa o
    # fluxo em torno de 1, que e a convencao que o modulo espera.
    normalizada = curva.remove_nans().normalize()

    tempo = [float(v) for v in normalizada.time.value]
    fluxo = [float(v) for v in normalizada.flux.value]

    pares = [(t, f) for t, f in zip(tempo, fluxo) if math.isfinite(t) and math.isfinite(f)]
    pares.sort(key=lambda par: par[0])

    if not pares:
        raise SystemExit("a curva ficou vazia depois de remover NaN.")

    t0 = pares[0][0]

    documento = {
        "schema": "orbital.lightcurve/1",
        "procedencia": {
            "missao": "TESS",
            "instrumento": "TESS Photometer",
            "pipeline": "SPOC",
            "produto": "PDCSAP_FLUX",
            "alvo": alvo,
            "tic": str(args.tic) if args.tic else None,
            "setor": args.setor,
            "cadenciaSegundos": args.cadencia,
            "arquivoOrigem": caminho_fits.name if caminho_fits else None,
            "sha256": somar_arquivo(arquivo_local) if arquivo_local and arquivo_local.exists() else None,
            "arquivo": "MAST — Mikulski Archive for Space Telescopes",
            "obtidoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            # Decisao de processamento, nao ajuste: a mascara descarta
            # cadencias e muda o dado. Sem este campo, duas curvas do mesmo
            # FITS com mascaras diferentes ficam indistinguiveis (ADR 0014).
            "mascaraQualidade": args.mascara,
            "citacao": CITACOES.get(
                "TESS",
                "PREENCHER: ver termos de reconhecimento do arquivo de origem",
            ),
        },
        "rotulo": args.rotulo,
        "unidades": {"tempo": "dias desde o primeiro ponto", "fluxo": "relativo, normalizado"},
        "pontos": len(pares),
        # Tempo relativo ao primeiro ponto: o modulo nao precisa do BTJD
        # absoluto, e numeros menores sofrem menos com ponto flutuante.
        "tempo": [round(t - t0, 8) for t, _ in pares],
        "fluxo": [round(f, 8) for _, f in pares],
        "tempoInicialBtjd": round(t0, 8),
    }

    destino = Path(args.saida)
    destino.mkdir(parents=True, exist_ok=True)

    nome = (f"tic{args.tic}" if args.tic else "alvo") + f"-s{args.setor:02d}.json"
    (destino / nome).write_text(json.dumps(documento, ensure_ascii=False), encoding="utf-8")

    print(f"{len(pares)} pontos -> {destino / nome}")

    if documento["procedencia"]["sha256"] is None:
        print("AVISO: nao consegui localizar o FITS baixado para somar o hash.")
        print("       Rode de novo apontando o cache do lightkurve, ou some a mao:")
        print("       sha256sum ~/.lightkurve/cache/.../*.fits")


if __name__ == "__main__":
    main()
