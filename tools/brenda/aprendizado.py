#!/usr/bin/env python3
"""
Curva de aprendizado da Brenda — mais dado ainda ajuda?

A pergunta atravessa quatro treinos sem resposta limpa. Ela ficou confundida
porque três coisas mudaram de uma vez entre o terceiro e o quarto: o corpus
dobrou, as classes equilibraram e a comparação virou justa. As três empurram na
mesma direção.

Este script separa a variável. Treina o mesmo modelo, com a mesma avaliação,
sobre subamostras de tamanho crescente do **mesmo** corpus — então classes,
features e método ficam fixos, e só o tamanho muda.

    python3 aprendizado.py --dados dados/resultados.csv

O QUE A FORMA DA CURVA RESPONDE

Se ela ainda sobe em 600, mais dado é investimento com retorno e vale as horas
de download. Se achatou, o gargalo passou a ser outro — feature, rótulo ou
método — e baixar mais alvos seria gastar tempo no lugar errado.

POR QUE REPETIR CADA TAMANHO

Uma subamostra de 100 pode ser sortuda. Cada tamanho é sorteado várias vezes,
com sementes diferentes, e o que se reporta é a média entre sorteios com o
espalhamento ao lado. Sem isso, a curva mede sorte tanto quanto tamanho.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score

from treinar import FEATURES, LimiarUnico, carregar

TAMANHOS = [100, 200, 300, 400, 600, 800, 1000, 1170]


def subamostra(
    X: np.ndarray, y: np.ndarray, n: int, semente: int
) -> tuple[np.ndarray, np.ndarray]:
    """Recorte estratificado: mantém a proporção entre as classes."""
    rng = np.random.default_rng(semente)
    escolhidos: list[int] = []

    for classe in np.unique(y):
        indices = np.flatnonzero(y == classe)
        quantos = min(len(indices), round(n * len(indices) / len(y)))
        escolhidos.extend(rng.choice(indices, size=quantos, replace=False))

    return X[escolhidos], y[escolhidos]


def medir(modelo, X: np.ndarray, y: np.ndarray, folds: int) -> float:
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=20260902)

    return float(cross_val_score(modelo, X, y, cv=cv, scoring="balanced_accuracy").mean())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados", required=True)
    parser.add_argument("--repeticoes", type=int, default=5)
    parser.add_argument("--folds", type=int, default=5)
    args = parser.parse_args()

    X, y, _ = carregar(Path(args.dados).expanduser())

    print(f"{len(y)} alvos · {int((y == 1).sum())} planetas · {int((y == 0).sum())} falsos")
    print(f"features: {', '.join(FEATURES)}")
    print(f"{args.repeticoes} sorteios por tamanho, validação cruzada de {args.folds} dobras\n")

    print(f"  {'n':>5}  {'limiar validado':>22}  {'Brenda (árvores)':>22}  {'ganho':>8}")

    linhas: list[tuple[int, float, float]] = []

    for n in TAMANHOS:
        # O ultimo tamanho acompanha o corpus: se ele crescer, a curva chega ate
        # onde o dado chega, sem editar a lista.
        if n > len(y):
            if n == TAMANHOS[-1] or TAMANHOS[TAMANHOS.index(n) - 1] >= len(y):
                continue
            n = len(y)

        bases: list[float] = []
        modelos: list[float] = []

        for r in range(args.repeticoes):
            # Semente derivada do tamanho e da repetição: o mesmo comando
            # devolve a mesma curva, e tamanhos diferentes não compartilham
            # sorteio por acidente.
            Xc, yc = subamostra(X, y, n, semente=20260902 + n * 100 + r)

            if len(np.unique(yc)) < 2 or len(yc) < args.folds * 2:
                continue

            bases.append(medir(LimiarUnico(), Xc, yc, args.folds))
            modelos.append(
                medir(
                    HistGradientBoostingClassifier(
                        max_iter=200, max_depth=3, learning_rate=0.08, random_state=20260902
                    ),
                    Xc,
                    yc,
                    args.folds,
                )
            )

        if not bases:
            continue

        base = float(np.mean(bases))
        modelo = float(np.mean(modelos))
        linhas.append((n, base, modelo))

        print(
            f"  {n:>5}  {base * 100:>16.1f}% ±{np.std(bases) * 100:>3.1f}"
            f"  {modelo * 100:>16.1f}% ±{np.std(modelos) * 100:>3.1f}"
            f"  {(modelo - base) * 100:>+7.1f}"
        )

    if len(linhas) < 3:
        return

    # O que interessa não é o valor final, é se ainda está subindo. Compara o
    # último terço da curva com o terço do meio.
    meio = linhas[len(linhas) // 3][2]
    fim = linhas[-1][2]
    passo_final = linhas[-1][2] - linhas[-2][2]

    print(f"\n  do primeiro terço ao fim: {(fim - meio) * 100:+.1f} pontos")
    print(f"  último passo ({linhas[-2][0]} → {linhas[-1][0]}): {passo_final * 100:+.1f} pontos")

    if passo_final > 0.01:
        print("\n  A curva ainda sobe. Mais dado tende a render.")
    elif passo_final > 0.003:
        print("\n  A curva sobe devagar. O retorno de mais dado está diminuindo.")
    else:
        print("\n  A curva achatou. O gargalo deixou de ser o tamanho da amostra.")


if __name__ == "__main__":
    main()
