/**
 * Box Least Squares — TypeScript puro, sem React (ADR 0007).
 *
 * O método de busca de trânsitos: para cada período candidato, dobra a curva
 * em fase e procura a caixa — um intervalo contíguo de fase — que melhor
 * separa um patamar baixo de um patamar alto. O período em que essa separação
 * é mais convincente é o candidato a período orbital.
 *
 * A referência é Kovács, Zucker & Mazeh (2002). O que se maximiza é a
 * *signal residue*, `s² / (r(1−r))`, com `s` a soma ponderada do fluxo dentro
 * da caixa e `r` o peso total lá dentro. O denominador é o que impede o
 * método de vencer com uma caixa que cobre quase tudo ou quase nada: nos dois
 * extremos ele explode e derruba a pontuação.
 *
 * Duas escolhas de implementação valem registro:
 *
 * A grade é **uniforme em frequência**, não em período. Trânsitos de período
 * curto se deslocam de fase muito mais rápido, e uma grade uniforme em período
 * gastaria a maior parte dos testes na região onde eles menos importam,
 * deixando buracos justamente onde o sinal é estreito.
 *
 * O laço tem **teto fixo de iterações** e nenhuma tolerância de convergência.
 * Mesma entrada, mesmo número de operações, mesmo resultado — a determinismo
 * que o ADR 0007 exige, e a condição para o teste de recuperação significar
 * alguma coisa.
 */

import type { LightCurve } from "./synthetic";

export interface BlsOptions {
  /** Menor período testado, em dias. */
  minPeriod: number;
  /** Maior período testado, em dias. */
  maxPeriod: number;
  /** Quantos períodos testar. */
  periodCount: number;
  /** Divisões de fase por período. */
  bins: number;
  /** Menor fração do período que a caixa pode ocupar. */
  minDuty: number;
  /** Maior fração do período que a caixa pode ocupar. */
  maxDuty: number;
}

export const DEFAULT_BLS: BlsOptions = {
  minPeriod: 0.5,
  maxPeriod: 12,
  periodCount: 2000,
  bins: 200,
  minDuty: 0.005,
  maxDuty: 0.12,
};

export interface TransitCandidate {
  /** Período do melhor ajuste, em dias. */
  period: number;
  /** Signal residue — a altura do pico no periodograma. */
  power: number;
  /** Profundidade da caixa, em fração do fluxo. */
  depth: number;
  /** Largura da caixa, em dias. */
  durationDays: number;
  /** Instante do centro de um trânsito, em dias. */
  epoch: number;
}

export interface BlsResult {
  /** Períodos testados, em ordem crescente. */
  periods: Float64Array;
  /** Signal residue de cada período — o periodograma. */
  power: Float64Array;
  /** O melhor ajuste encontrado, ou `null` se a curva não permitiu nenhum. */
  best: TransitCandidate | null;
}

export function boxLeastSquares(
  curve: LightCurve,
  options: Partial<BlsOptions> = {},
): BlsResult {
  const opcoes = { ...DEFAULT_BLS, ...options };

  const total = curve.time.length;
  const nb = Math.max(8, opcoes.bins | 0);
  const quantidade = Math.max(1, opcoes.periodCount | 0);

  const periods = new Float64Array(quantidade);
  const power = new Float64Array(quantidade);

  if (total < nb) {
    return { periods, power, best: null };
  }

  // Fluxo centrado: o método mede o contraste entre dentro e fora da caixa, e
  // a média sai da conta de qualquer jeito. Centrar antes evita repetir a
  // subtração dentro do laço mais quente do arquivo.
  let media = 0;
  for (let i = 0; i < total; i += 1) media += curve.flux[i];
  media /= total;

  const x = new Float64Array(total);
  for (let i = 0; i < total; i += 1) x[i] = curve.flux[i] - media;

  const peso = 1 / total;
  const t0 = curve.time[0];

  const larguraMin = Math.max(1, Math.floor(opcoes.minDuty * nb));
  const larguraMax = Math.max(larguraMin, Math.ceil(opcoes.maxDuty * nb));

  const somaFluxo = new Float64Array(nb);
  const somaPeso = new Float64Array(nb);
  // Prefixos sobre a fase duplicada: a caixa pode cruzar a fase zero, e
  // duplicar é mais barato e mais legível que tratar o retorno com módulo
  // dentro do laço.
  const prefixoFluxo = new Float64Array(2 * nb + 1);
  const prefixoPeso = new Float64Array(2 * nb + 1);

  const frequenciaMax = 1 / opcoes.minPeriod;
  const frequenciaMin = 1 / opcoes.maxPeriod;

  let melhor: TransitCandidate | null = null;

  for (let k = 0; k < quantidade; k += 1) {
    // Frequência descendente produz período ascendente, que é a ordem em que o
    // periodograma é lido.
    const fracao = quantidade === 1 ? 0 : k / (quantidade - 1);
    const frequencia = frequenciaMax - (frequenciaMax - frequenciaMin) * fracao;
    const periodo = 1 / frequencia;

    periods[k] = periodo;

    somaFluxo.fill(0);
    somaPeso.fill(0);

    for (let i = 0; i < total; i += 1) {
      const fase = (curve.time[i] - t0) / periodo;
      let caixa = ((fase - Math.floor(fase)) * nb) | 0;

      // Ponto de fase exatamente 1 cai fora por arredondamento.
      if (caixa >= nb) caixa = nb - 1;

      somaFluxo[caixa] += peso * x[i];
      somaPeso[caixa] += peso;
    }

    for (let i = 0; i < 2 * nb; i += 1) {
      const origem = i < nb ? i : i - nb;
      prefixoFluxo[i + 1] = prefixoFluxo[i] + somaFluxo[origem];
      prefixoPeso[i + 1] = prefixoPeso[i] + somaPeso[origem];
    }

    let melhorLocal = 0;
    let melhorInicio = 0;
    let melhorLargura = larguraMin;
    let melhorSoma = 0;
    let melhorPeso = 0;

    for (let inicio = 0; inicio < nb; inicio += 1) {
      for (let largura = larguraMin; largura <= larguraMax; largura += 1) {
        const s = prefixoFluxo[inicio + largura] - prefixoFluxo[inicio];
        const r = prefixoPeso[inicio + largura] - prefixoPeso[inicio];

        // Caixa vazia ou que engole a curva inteira não descreve trânsito
        // nenhum, e faria o denominador tender a zero.
        if (r <= 0 || r >= 1) continue;

        // Só interessa caixa mais escura que o entorno. Sem este sinal o
        // método encontraria com igual entusiasmo um *aumento* de brilho,
        // que não é trânsito.
        if (s >= 0) continue;

        const residuo = (s * s) / (r * (1 - r));

        if (residuo > melhorLocal) {
          melhorLocal = residuo;
          melhorInicio = inicio;
          melhorLargura = largura;
          melhorSoma = s;
          melhorPeso = r;
        }
      }
    }

    const pontuacao = Math.sqrt(melhorLocal);
    power[k] = pontuacao;

    if (melhorLocal > 0 && (melhor === null || pontuacao > melhor.power)) {
      const centro = (melhorInicio + melhorLargura / 2) / nb;

      melhor = {
        period: periodo,
        power: pontuacao,
        depth: -melhorSoma / (melhorPeso * (1 - melhorPeso)),
        durationDays: (melhorLargura / nb) * periodo,
        epoch: t0 + (centro - Math.floor(centro)) * periodo,
      };
    }
  }

  return { periods, power, best: melhor };
}
