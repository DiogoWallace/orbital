/**
 * O caminho completo da análise — TypeScript puro, sem React (ADR 0007).
 *
 * Achatar, buscar, dobrar, medir. Cada passo mora no seu arquivo e este aqui
 * apenas os encadeia, para que o componente do módulo não precise conhecer a
 * ordem nem os estados intermediários.
 *
 * A relação sinal/ruído é o passo que separa a ferramenta do brinquedo. O BLS
 * sempre devolve um melhor período — ele é uma busca, não um juiz, e vai
 * encontrar a melhor caixa mesmo numa curva que só tem ruído. É a relação
 * sinal/ruído que responde se aquele melhor vale alguma coisa, e é por isso
 * que ela é calculada aqui e não deixada a cargo de quem lê o gráfico.
 */

import { boxLeastSquares, type BlsOptions, type BlsResult, type TransitCandidate } from "./bls";
import { detrend, windowPointsFor } from "./detrend";
import type { LightCurve } from "./synthetic";

export interface FoldedCurve {
  /** Fase em relação ao centro do trânsito, em [-0,5 ; 0,5), já ordenada. */
  phase: Float64Array;
  flux: Float64Array;
}

/**
 * Dobra a curva no período, centrando o trânsito na fase zero.
 *
 * Ordenar por fase é o que permite desenhar a curva dobrada como linha em vez
 * de nuvem de pontos, e é onde a estrutura do trânsito fica visível a olho —
 * o gráfico que convence alguém de que existe mesmo um planeta ali.
 */
export function foldCurve(curve: LightCurve, period: number, epoch: number): FoldedCurve {
  const total = curve.time.length;
  const bruta = new Float64Array(total);

  for (let i = 0; i < total; i += 1) {
    const ciclos = (curve.time[i] - epoch) / period + 0.5;

    bruta[i] = ciclos - Math.floor(ciclos) - 0.5;
  }

  const indices = Array.from({ length: total }, (_, i) => i);
  indices.sort((a, b) => bruta[a] - bruta[b]);

  const phase = new Float64Array(total);
  const flux = new Float64Array(total);

  for (let i = 0; i < total; i += 1) {
    phase[i] = bruta[indices[i]];
    flux[i] = curve.flux[indices[i]];
  }

  return { phase, flux };
}

/**
 * Relação sinal/ruído do candidato.
 *
 * Profundidade dividida pelo erro da própria profundidade: o espalhamento
 * fora do trânsito, reduzido pela raiz do número de pontos que caem dentro
 * dele. Um trânsito raso medido com muitos pontos pode ser mais confiável que
 * um profundo medido com três — e é essa comparação que o número expressa.
 */
export function signalToNoise(curve: LightCurve, candidate: TransitCandidate): number {
  const meia = candidate.durationDays / 2;

  let dentro = 0;
  let somaFora = 0;
  let quadradosFora = 0;
  let fora = 0;

  for (let i = 0; i < curve.time.length; i += 1) {
    const ciclos = (curve.time[i] - candidate.epoch) / candidate.period + 0.5;
    const fase = (ciclos - Math.floor(ciclos) - 0.5) * candidate.period;

    if (Math.abs(fase) <= meia) {
      dentro += 1;
    } else {
      fora += 1;
      somaFora += curve.flux[i];
      quadradosFora += curve.flux[i] * curve.flux[i];
    }
  }

  if (dentro === 0 || fora < 2) return 0;

  const mediaFora = somaFora / fora;
  const variancia = Math.max(quadradosFora / fora - mediaFora * mediaFora, 0);
  const desvio = Math.sqrt(variancia);

  if (desvio === 0) return 0;

  return candidate.depth / (desvio / Math.sqrt(dentro));
}

export interface AnalysisOptions {
  /** Janela da mediana móvel, em dias. */
  detrendWindowDays: number;
  bls: Partial<BlsOptions>;
}

export const DEFAULT_ANALYSIS: AnalysisOptions = {
  detrendWindowDays: 0.5,
  bls: {},
};

export interface AnalysisResult {
  /** A curva já achatada — é sobre ela que a busca acontece. */
  detrended: LightCurve;
  /** O periodograma inteiro, para desenhar. */
  periodogram: BlsResult;
  /** O melhor candidato, ou `null` se não houve nenhum. */
  candidate: TransitCandidate | null;
  /** Curva dobrada no período do candidato. `null` sem candidato. */
  folded: FoldedCurve | null;
  /** Relação sinal/ruído do candidato. Zero sem candidato. */
  snr: number;
}

export function analyse(
  curve: LightCurve,
  options: Partial<AnalysisOptions> = {},
): AnalysisResult {
  const opcoes = { ...DEFAULT_ANALYSIS, ...options };

  const achatada = detrend(curve, windowPointsFor(curve, opcoes.detrendWindowDays));
  const periodogram = boxLeastSquares(achatada, opcoes.bls);
  const candidate = periodogram.best;

  return {
    detrended: achatada,
    periodogram,
    candidate,
    folded: candidate ? foldCurve(achatada, candidate.period, candidate.epoch) : null,
    snr: candidate ? signalToNoise(achatada, candidate) : 0,
  };
}
