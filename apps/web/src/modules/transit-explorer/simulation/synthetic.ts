/**
 * Curvas de luz sintéticas — TypeScript puro, sem React (ADR 0007).
 *
 * Existe para que a análise possa ser construída e testada antes de o primeiro
 * arquivo FITS ser baixado. Uma curva sintética tem uma vantagem que nenhuma
 * curva real tem: sabemos a resposta. Se o método não recupera um trânsito que
 * nós mesmos injetamos, o problema é do método — não do dado, não da estrela,
 * não do instrumento.
 *
 * Unidades: tempo em dias, fluxo normalizado em torno de 1. É a convenção do
 * arquivo do TESS, e mantê-la aqui evita uma conversão no dia em que o dado
 * real entrar.
 *
 * **Nada aqui usa `Math.random`.** O gerador é semeado e determinístico: a
 * mesma semente produz exatamente a mesma curva, em qualquer máquina. Sem isso
 * um teste que falha uma vez a cada vinte execuções seria indistinguível de um
 * método instável.
 */

export interface LightCurve {
  /** Instantes de observação, em dias. */
  time: Float64Array;
  /** Fluxo relativo, normalizado em torno de 1. */
  flux: Float64Array;
}

export interface SyntheticOptions {
  /** Extensão da série, em dias. Um setor do TESS dura cerca de 27. */
  baselineDays: number;
  /** Intervalo entre observações, em minutos. */
  cadenceMinutes: number;
  /** Período orbital, em dias. `null` gera uma curva sem trânsito nenhum. */
  period: number | null;
  /** Profundidade do trânsito, em fração do fluxo. 0.01 é 1%. */
  depth: number;
  /**
   * Profundidade do eclipse secundário, em fração do fluxo.
   *
   * Existe para poder gerar uma **binária eclipsante**, que é o falso positivo
   * clássico da busca por trânsitos: duas estrelas se eclipsando produzem uma
   * queda periódica igualzinha à de um planeta. O que as separa é a companheira
   * também sumir atrás da principal, meio período depois, numa queda mais rasa.
   * Sem isso no gerador, o módulo não teria como ensinar a desconfiar.
   */
  secondaryDepth: number;
  /** Duração do trânsito, em horas. */
  durationHours: number;
  /** Instante do primeiro trânsito, em dias desde o início. */
  epoch: number;
  /** Desvio padrão do ruído branco, em fração do fluxo. */
  noise: number;
  /** Amplitude da variabilidade estelar lenta, em fração do fluxo. */
  variabilityAmplitude: number;
  /** Período da variabilidade estelar, em dias. */
  variabilityPeriod: number;
  /**
   * Fração da duração gasta em entrada e saída.
   *
   * Um trânsito real não é um degrau: o disco do planeta leva tempo para
   * cobrir e descobrir a estrela. Manter o formato trapezoidal aqui é o que
   * impede o teste de validar um método que só funciona contra a caixa
   * perfeita que ele mesmo assume.
   */
  ingressFraction: number;
  /** Semente do gerador. Mesma semente, mesma curva. */
  seed: number;
}

export const DEFAULT_SYNTHETIC: SyntheticOptions = {
  baselineDays: 27,
  cadenceMinutes: 2,
  period: 3.2,
  depth: 0.01,
  secondaryDepth: 0,
  durationHours: 2.5,
  epoch: 1.1,
  noise: 0.0012,
  variabilityAmplitude: 0.003,
  variabilityPeriod: 8.4,
  ingressFraction: 0.15,
  seed: 20260831,
};

/**
 * Gerador pseudoaleatório de 32 bits (mulberry32).
 *
 * Escolhido por caber em oito linhas e não ter estado escondido: o único
 * estado é a semente, então duas execuções com a mesma semente são idênticas
 * por construção. Não serve para criptografia e não precisa servir.
 */
export function randomSource(seed: number): () => number {
  let estado = seed | 0;

  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ruído gaussiano por Box–Muller.
 *
 * O ruído fotométrico real é aproximadamente gaussiano, e usar uma
 * distribuição uniforme faria o método parecer melhor do que é: valores
 * extremos, que são justamente os que produzem falso positivo, quase nunca
 * apareceriam.
 */
export function gaussianSource(random: () => number): () => number {
  let guardado: number | null = null;

  return () => {
    if (guardado !== null) {
      const valor = guardado;
      guardado = null;

      return valor;
    }

    // `1 - random()` evita o zero, que faria o logaritmo divergir.
    const u = 1 - random();
    const v = random();
    const raio = Math.sqrt(-2 * Math.log(u));

    guardado = raio * Math.sin(2 * Math.PI * v);

    return raio * Math.cos(2 * Math.PI * v);
  };
}

/**
 * Fração do disco coberta em um instante, entre 0 (fora) e 1 (fundo do trânsito).
 *
 * O perfil é trapezoidal: sobe durante a entrada, fica plano, desce na saída.
 */
export function transitShape(
  time: number,
  period: number,
  epoch: number,
  durationDays: number,
  ingressFraction: number,
): number {
  // Distância ao centro do trânsito mais próximo, em dias.
  const fase = (((time - epoch) % period) + period) % period;
  const distancia = Math.min(fase, period - fase);

  const meia = durationDays / 2;

  if (distancia >= meia) return 0;

  const rampa = meia * ingressFraction;

  if (rampa <= 0 || distancia <= meia - rampa) return 1;

  return (meia - distancia) / rampa;
}

export function generateLightCurve(options: Partial<SyntheticOptions> = {}): LightCurve {
  const opcoes = { ...DEFAULT_SYNTHETIC, ...options };

  const passo = opcoes.cadenceMinutes / (60 * 24);
  const total = Math.max(1, Math.floor(opcoes.baselineDays / passo));

  const time = new Float64Array(total);
  const flux = new Float64Array(total);

  const random = randomSource(opcoes.seed);
  const gaussiano = gaussianSource(random);

  const duracaoDias = opcoes.durationHours / 24;
  // Uma fase inicial arbitrária, mas derivada da semente: sem isso toda curva
  // começaria no mesmo ponto da variabilidade e o detrend pareceria melhor do
  // que é.
  const faseVariabilidade = random() * 2 * Math.PI;

  for (let i = 0; i < total; i += 1) {
    const t = i * passo;

    const variabilidade =
      opcoes.variabilityAmplitude *
      Math.sin((2 * Math.PI * t) / opcoes.variabilityPeriod + faseVariabilidade);

    const cobertura =
      opcoes.period === null
        ? 0
        : transitShape(t, opcoes.period, opcoes.epoch, duracaoDias, opcoes.ingressFraction);

    // O secundário fica meio período depois do primário — é essa assinatura,
    // e não a profundidade sozinha, que denuncia uma binária eclipsante.
    const secundario =
      opcoes.period === null || opcoes.secondaryDepth === 0
        ? 0
        : transitShape(
            t,
            opcoes.period,
            opcoes.epoch + opcoes.period / 2,
            duracaoDias,
            opcoes.ingressFraction,
          );

    time[i] = t;
    flux[i] =
      1 +
      variabilidade -
      cobertura * opcoes.depth -
      secundario * opcoes.secondaryDepth +
      gaussiano() * opcoes.noise;
  }

  return { time, flux };
}
