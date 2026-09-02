#!/usr/bin/env python3
"""
Brenda — primeiro treino.

Le o `resultados.csv` produzido pelo analisador em lote e treina um
classificador para separar planeta confirmado de falso positivo, a partir das
features que o BLS ja mede.

    python3 treinar.py --dados ~/dados/tess-lote/resultados.csv

O QUE ESTE SCRIPT SE RECUSA A FAZER

**Nao usa `erro_periodo_rel` como feature.** Ele compara o periodo recuperado
com o publicado, e o publicado so existe onde alguem ja decidiu a resposta. Um
modelo que o recebesse teria acuracia alta e utilidade zero: em alvo novo o
campo nao existe. Ele entra so como diagnostico, nunca como entrada.

**Nao reporta acuracia dentro do treino.** Com 262 amostras, qualquer modelo
decora. O que sai daqui e validacao cruzada estratificada, que e a unica medida
comparavel a linha de base.

**Nao usa acuracia bruta.** As classes sao desiguais (112 x 150), e responder
sempre "falso positivo" acertaria 57% sem aprender nada. A metrica e acuracia
balanceada — media entre sensibilidade e especificidade —, a mesma da linha de
base, para a comparacao significar alguma coisa.

O QUE A COMPARACAO PRECISA RESPEITAR

O modelo so pode ser comparado com a melhor feature isolada **medida no mesmo
subconjunto**. Trocar o recorte entre os dois lados e a forma mais facil de
declarar vitoria sem ter vencido, entao a linha de base e recalculada aqui, em
cada corte, em vez de citada de memoria.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Nada aqui depende de conhecer a resposta: sao medidas da propria curva.
FEATURES = [
    "profundidade_pct",
    "snr",
    "pico",
    "secundario_pct",
    "odd_even",
    "forma",
    "duracao_h",
]

PROIBIDAS = {"erro_periodo_rel", "periodo_publicado", "profundidade_publicada_ppm"}

# `periodo_recuperado` ficou de fora depois do primeiro treino. Ele saiu como a
# feature mais forte, e nao por fisica: a selecao do lote filtra candidatos por
# periodo abaixo de nove dias, entao a coluna codifica o recorte da amostra. Um
# modelo que a usa aprende como eu montei o conjunto, e nao o que distingue um
# planeta.


def carregar(caminho: Path) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    with caminho.open(encoding="utf-8") as arquivo:
        linhas = list(csv.DictReader(arquivo))

    X: list[list[float]] = []
    y: list[int] = []
    mantidas: list[dict] = []

    for linha in linhas:
        try:
            valores = [float(linha[f]) for f in FEATURES]
        except (ValueError, KeyError):
            continue

        if not all(np.isfinite(valores)):
            continue

        X.append(valores)
        y.append(1 if linha["rotulo"] == "planeta" else 0)
        mantidas.append(linha)

    return np.array(X), np.array(y), mantidas


def melhor_feature_isolada(X: np.ndarray, y: np.ndarray) -> tuple[str, float]:
    """A linha de base: melhor limiar unico, em acuracia balanceada."""
    melhor = ("", 0.0)

    for i, nome in enumerate(FEATURES):
        coluna = X[:, i]

        for limiar in np.unique(coluna):
            for maior in (True, False):
                previsto = (coluna > limiar) if maior else (coluna < limiar)

                sens = previsto[y == 1].mean() if (y == 1).any() else 0
                espec = (~previsto[y == 0]).mean() if (y == 0).any() else 0
                balanceada = (sens + espec) / 2

                if balanceada > melhor[1]:
                    melhor = (nome, balanceada)

    return melhor


def avaliar(nome: str, modelo, X: np.ndarray, y: np.ndarray, folds: int) -> float:
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=20260902)
    notas = cross_val_score(modelo, X, y, cv=cv, scoring="balanced_accuracy")

    print(f"    {nome:<28} {notas.mean() * 100:>6.1f}%  (±{notas.std() * 100:.1f})")

    return float(notas.mean())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados", required=True)
    parser.add_argument("--folds", type=int, default=5)
    args = parser.parse_args()

    assert not (PROIBIDAS & set(FEATURES)), "feature que vaza o rotulo entrou na lista"

    X, y, linhas = carregar(Path(args.dados).expanduser())

    print(f"{len(y)} alvos · {int((y == 1).sum())} planetas · {int((y == 0).sum())} falsos")
    print(f"features: {', '.join(FEATURES)}\n")

    # `snr > 15` e filtro legitimo: nao depende de conhecer a resposta.
    cortes = [
        ("todos", np.ones(len(y), dtype=bool)),
        ("S/R > 15", X[:, FEATURES.index("snr")] > 15),
    ]

    for rotulo, mascara in cortes:
        Xc, yc = X[mascara], y[mascara]

        if len(np.unique(yc)) < 2 or len(yc) < 40:
            continue

        print(f"=== {rotulo}  ({len(yc)} alvos: {int((yc==1).sum())} planetas, {int((yc==0).sum())} falsos)")

        nome_base, base = melhor_feature_isolada(Xc, yc)
        print(f"    {'linha de base (' + nome_base + ')':<28} {base * 100:>6.1f}%")

        avaliar("sempre a classe maior", DummyClassifier(strategy="most_frequent"), Xc, yc, args.folds)

        logistica = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced"))
        avaliar("regressão logística", logistica, Xc, yc, args.folds)

        floresta = HistGradientBoostingClassifier(
            max_iter=200, max_depth=3, learning_rate=0.08, random_state=20260902
        )
        modelo = avaliar("Brenda (árvores)", floresta, Xc, yc, args.folds)

        print(f"    {'ganho sobre a base':<28} {(modelo - base) * 100:>+6.1f} pontos\n")

    # --- Peso de cada feature na regressão, no conjunto todo ---------------
    escala = StandardScaler().fit(X)
    ajustada = LogisticRegression(max_iter=2000, class_weight="balanced").fit(escala.transform(X), y)

    print("peso de cada feature (regressão, dados padronizados)")
    ordem = np.argsort(-np.abs(ajustada.coef_[0]))

    for i in ordem:
        peso = ajustada.coef_[0][i]
        direcao = "→ planeta" if peso > 0 else "→ falso positivo"
        print(f"    {FEATURES[i]:<22} {peso:>+7.3f}  {direcao}")


if __name__ == "__main__":
    main()
