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

/**
 * Média do fluxo numa janela de fase, e quantos pontos caíram nela.
 *
 * `centro` e `meiaLargura` são em fase (fração do período), não em dias.
 */
function mediaNaFase(
  curve: LightCurve,
  candidate: TransitCandidate,
  centro: number,
  meiaLargura: number,
): { media: number; pontos: number } {
  let soma = 0;
  let pontos = 0;

  for (let i = 0; i < curve.time.length; i += 1) {
    const ciclos = (curve.time[i] - candidate.epoch) / candidate.period + 0.5;
    const fase = ciclos - Math.floor(ciclos) - 0.5;

    // Distância circular até o centro: a fase dá a volta, então 0,49 e -0,49
    // são vizinhas, não opostas.
    const bruta = Math.abs(fase - centro);
    const distancia = Math.min(bruta, 1 - bruta);

    if (distancia <= meiaLargura) {
      soma += curve.flux[i];
      pontos += 1;
    }
  }

  return { media: pontos > 0 ? soma / pontos : Number.NaN, pontos };
}

/**
 * Profundidade do eclipse secundário, em fração do fluxo.
 *
 * Procura uma queda na fase 0,5 — meio período depois do evento principal. Um
 * planeta não produz uma; uma estrela companheira sim, ao passar por trás da
 * principal. É o discriminador mais direto entre trânsito e binária eclipsante.
 *
 * Devolve 0 quando não há queda ali, e nunca negativo: um *aumento* de brilho
 * na fase oposta não é eclipse secundário.
 */
export function secondaryDepth(curve: LightCurve, candidate: TransitCandidate): number {
  const meiaLargura = candidate.durationDays / candidate.period / 2;

  const secundario = mediaNaFase(curve, candidate, 0.5, meiaLargura);
  // Base medida longe dos dois eventos, para não contaminar a referência.
  const base = mediaNaFase(curve, candidate, 0.25, meiaLargura);

  if (!Number.isFinite(secundario.media) || !Number.isFinite(base.media)) return 0;

  return Math.max(base.media - secundario.media, 0);
}

/**
 * Diferença entre a profundidade dos eventos pares e a dos ímpares.
 *
 * Se o período verdadeiro for o dobro do encontrado — o caso de uma binária
 * cujas duas estrelas se eclipsam alternadamente —, os eventos alternam de
 * profundidade, e dobrar no período errado empilha os dois tipos no mesmo lugar.
 * Separá-los revela a alternância.
 *
 * Devolve a diferença relativa à profundidade média. Perto de zero para um
 * trânsito planetário; grande para a binária mal identificada.
 */
export function oddEvenDifference(
  curve: LightCurve,
  candidate: TransitCandidate,
): number {
  const meia = candidate.durationDays / 2;

  let somaPar = 0;
  let pontosPar = 0;
  let somaImpar = 0;
  let pontosImpar = 0;
  let somaFora = 0;
  let pontosFora = 0;

  for (let i = 0; i < curve.time.length; i += 1) {
    const decorrido = (curve.time[i] - candidate.epoch) / candidate.period;
    const ciclo = Math.round(decorrido);
    const distancia = Math.abs(decorrido - ciclo) * candidate.period;

    if (distancia <= meia) {
      if (Math.abs(ciclo % 2) === 0) {
        somaPar += curve.flux[i];
        pontosPar += 1;
      } else {
        somaImpar += curve.flux[i];
        pontosImpar += 1;
      }
    } else if (Math.abs(decorrido - ciclo) > 0.2) {
      somaFora += curve.flux[i];
      pontosFora += 1;
    }
  }

  if (pontosPar === 0 || pontosImpar === 0 || pontosFora === 0) return 0;

  const base = somaFora / pontosFora;
  const profundidadePar = base - somaPar / pontosPar;
  const profundidadeImpar = base - somaImpar / pontosImpar;
  const media = (profundidadePar + profundidadeImpar) / 2;

  if (media <= 0) return 0;

  return Math.abs(profundidadePar - profundidadeImpar) / media;
}

/**
 * Forma do trânsito: fundo chato ou bico.
 *
 * Um planeta cobre o disco inteiro por boa parte da passagem, então a queda tem
 * fundo achatado — perfil em U. Uma binária de roçadura nunca encobre por
 * completo: a companheira entra e sai, e o mínimo é um ponto — perfil em V. É
 * um dos discriminadores que a triagem real usa, e o que o torna valioso aqui é
 * ser **ortogonal à amplitude**: profundidade, pico e relação sinal/ruído já
 * medem "quão forte é a queda" três vezes, e a forma não mede isso.
 *
 * A razão devolvida é a largura a 75% da profundidade dividida pela largura a
 * 50%. Para uma caixa perfeita as duas coincidem e a razão vale 1; para um V
 * ideal, a largura cai pela metade a cada degrau e a razão vale 0,5. Trânsito
 * real fica no meio, porque o escurecimento de bordo arredonda o fundo.
 *
 * Devolve 0 quando não dá para medir — poucos pontos, ou fundo raso demais para
 * os degraus se distinguirem do ruído. Zero aqui significa "não medido", e não
 * "perfil em V".
 */
export function transitShapeRatio(
  curve: LightCurve,
  candidate: TransitCandidate,
  bins = 24,
): number {
  const meiaFase = candidate.durationDays / candidate.period / 2;

  if (!Number.isFinite(meiaFase) || meiaFase <= 0) return 0;

  // Janela um pouco mais larga que o trânsito: precisa sobrar fora dele para a
  // linha de base ser medida no mesmo trecho, e não na curva inteira.
  const janela = meiaFase * 2;

  const somas = new Float64Array(bins);
  const contagens = new Float64Array(bins);

  for (let i = 0; i < curve.time.length; i += 1) {
    const ciclos = (curve.time[i] - candidate.epoch) / candidate.period + 0.5;
    const fase = ciclos - Math.floor(ciclos) - 0.5;

    if (Math.abs(fase) > janela) continue;

    let bin = Math.floor(((fase + janela) / (2 * janela)) * bins);
    if (bin < 0) bin = 0;
    if (bin >= bins) bin = bins - 1;

    somas[bin] += curve.flux[i];
    contagens[bin] += 1;
  }

  const perfil: number[] = [];
  for (let b = 0; b < bins; b += 1) {
    perfil.push(contagens[b] > 0 ? somas[b] / contagens[b] : Number.NaN);
  }

  // Base: os bins das pontas, que estão fora do trânsito por construção.
  const pontas = [
    ...perfil.slice(0, Math.floor(bins / 6)),
    ...perfil.slice(bins - Math.floor(bins / 6)),
  ].filter(Number.isFinite);

  if (pontas.length < 2) return 0;

  const base = pontas.reduce((a, b) => a + b, 0) / pontas.length;

  const validos = perfil.filter(Number.isFinite);
  if (validos.length < bins / 2) return 0;

  const fundo = Math.min(...validos);
  const profundidade = base - fundo;

  if (profundidade <= 0) return 0;

  const largura = (fracao: number): number =>
    perfil.filter((v) => Number.isFinite(v) && base - v >= fracao * profundidade).length;

  const meia = largura(0.5);
  const cheia = largura(0.75);

  // Com um bin só a 50% não há degrau para comparar: a razão seria 1 por
  // acidente, sugerindo fundo chato onde só há falta de resolução.
  if (meia < 2) return 0;

  return cheia / meia;
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
  /** Profundidade do eclipse secundário — o discriminador de binária. */
  secondaryDepth: number;
  /** Alternância entre eventos pares e ímpares, relativa à profundidade. */
  oddEven: number;
  /** Forma do fundo: ~1 é chato (planeta), ~0,5 é bico (roçadura). */
  shapeRatio: number;
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
    secondaryDepth: candidate ? secondaryDepth(achatada, candidate) : 0,
    oddEven: candidate ? oddEvenDifference(achatada, candidate) : 0,
    shapeRatio: candidate ? transitShapeRatio(achatada, candidate) : 0,
  };
}
