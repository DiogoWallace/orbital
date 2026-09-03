#!/usr/bin/env python3
"""
Acrescenta o centroide às curvas já baixadas, sem tocar na rede.

O deslocamento do centroide responde a pergunta que nenhuma medida de brilho
responde: **a queda aconteceu na estrela-alvo ou numa vizinha?** Uma binária
eclipsante de fundo, misturada na mesma abertura, produz uma queda periódica
convincente — e desloca o centro de luz da imagem enquanto ela dura. Um planeta
transitando o próprio alvo não desloca nada.

Custava, em tese, baixar *target pixel files*: dezenas de gigabytes. Não custa.
O arquivo de curva do SPOC já traz `MOM_CENTR1` e `MOM_CENTR2`, o centroide de
momento em coluna e linha, uma medida por cadência. Estava no dado desde o
começo.

    python3 extrair-centroide.py --curvas ~/dados/tess-lote/curvas

Lê os FITS do cache do lightkurve — nenhuma consulta ao MAST — e reescreve cada
JSON com as duas colunas novas. O fluxo é **regravado a partir do mesmo FITS**,
e não preservado do arquivo antigo: é o que garante que centroide e fluxo
descrevam as mesmas cadências. Alinhar duas séries que passaram por limpezas
diferentes seria erro silencioso do pior tipo.
"""

from __future__ import annotations

import argparse
import glob
import json
import re
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

NOME_FITS = re.compile(r"-s(?P<setor>\d{4})-(?P<tic>\d{16})-")


def indexar_cache(cache: Path) -> dict[tuple[str, int], str]:
    """Mapa (tic, setor) -> caminho do FITS."""
    indice: dict[tuple[str, int], str] = {}

    for caminho in glob.glob(str(cache / "**" / "*_lc.fits"), recursive=True):
        achado = NOME_FITS.search(Path(caminho).name)

        if not achado:
            continue

        chave = (str(int(achado.group("tic"))), int(achado.group("setor")))
        indice[chave] = caminho

    return indice


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curvas", required=True)
    parser.add_argument("--cache", default="~/.cache/lightkurve")
    parser.add_argument("--mascara", default="default")
    args = parser.parse_args()

    import lightkurve as lk
    import numpy as np

    pasta = Path(args.curvas).expanduser()
    indice = indexar_cache(Path(args.cache).expanduser())

    print(f"{len(indice)} arquivos no cache")

    feitos = 0
    pulados: list[str] = []

    for arquivo in sorted(pasta.glob("*.json")):
        documento = json.loads(arquivo.read_text(encoding="utf-8"))
        procedencia = documento.get("procedencia", {})

        setores = procedencia.get("setores") or [procedencia.get("setor")]

        # Emenda de vários setores exigiria concatenar centroides de sistemas de
        # coordenadas diferentes — cada setor tem sua própria posição no
        # detector. Não é só juntar, e por isso fica de fora até existir motivo.
        if len(setores) != 1 or setores[0] is None:
            pulados.append(f"{arquivo.name}: multi-setor")
            continue

        chave = (str(procedencia.get("tic")), int(setores[0]))
        caminho = indice.get(chave)

        if caminho is None:
            pulados.append(f"{arquivo.name}: sem FITS no cache")
            continue

        curva = lk.read(caminho, quality_bitmask=args.mascara, flux_column="pdcsap_flux")

        tempo = np.asarray(curva.time.value, dtype=float)
        fluxo = np.asarray(curva.flux.value, dtype=float)
        col = np.asarray(curva["mom_centr1"].value, dtype=float)
        lin = np.asarray(curva["mom_centr2"].value, dtype=float)

        # Uma cadência só entra se as quatro medidas existirem. Descartar por
        # série separada desalinharia o centroide do fluxo.
        bons = np.isfinite(tempo) & np.isfinite(fluxo) & np.isfinite(col) & np.isfinite(lin)

        if bons.sum() < 100:
            pulados.append(f"{arquivo.name}: menos de 100 cadências completas")
            continue

        tempo, fluxo, col, lin = tempo[bons], fluxo[bons], col[bons], lin[bons]

        ordem = np.argsort(tempo)
        tempo, fluxo, col, lin = tempo[ordem], fluxo[ordem], col[ordem], lin[ordem]

        mediana = float(np.median(fluxo))
        if mediana <= 0:
            pulados.append(f"{arquivo.name}: fluxo mediano não positivo")
            continue

        t0 = float(tempo[0])

        documento["pontos"] = int(len(tempo))
        documento["tempo"] = [round(float(t) - t0, 8) for t in tempo]
        documento["fluxo"] = [round(float(f) / mediana, 8) for f in fluxo]
        # Centroide em pixels do detector, relativo ao valor mediano: o valor
        # absoluto é a posição no CCD e não interessa; o que interessa é o
        # deslocamento durante o evento.
        documento["centroideCol"] = [round(float(v) - float(np.median(col)), 6) for v in col]
        documento["centroideLinha"] = [round(float(v) - float(np.median(lin)), 6) for v in lin]
        documento["tempoInicialBtjd"] = round(t0, 8)
        documento["procedencia"]["centroide"] = "MOM_CENTR1/2"

        arquivo.write_text(json.dumps(documento, ensure_ascii=False), encoding="utf-8")
        feitos += 1

        if feitos % 100 == 0:
            print(f"  {feitos} curvas com centroide")

    print(f"\n{feitos} curvas atualizadas · {len(pulados)} puladas")

    for motivo in pulados[:10]:
        print(f"  {motivo}")


if __name__ == "__main__":
    main()
