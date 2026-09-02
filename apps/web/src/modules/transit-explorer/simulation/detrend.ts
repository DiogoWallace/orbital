/**
 * Remoção da variabilidade estelar — TypeScript puro, sem React (ADR 0007).
 *
 * A estrela não fica parada. Manchas, rotação e pulsação produzem uma
 * ondulação lenta muitas vezes maior que o trânsito que se procura, e o BLS,
 * que assume uma linha de base plana, encontra essa ondulação antes de
 * encontrar o planeta. Achatar a curva não é limpeza cosmética: é o que torna
 * a busca possível.
 *
 * **Mediana móvel, e não média móvel.** A média é puxada por um único ponto
 * fora da curva — um raio cósmico, um pixel quente — e a mediana não é. Mais
 * importante: a média afundaria dentro do próprio trânsito, e o detrend
 * apagaria parte do sinal que se quer medir.
 *
 * O tamanho da janela é o compromisso central. Curta demais, ela acompanha o
 * trânsito e o remove junto com a variabilidade; longa demais, deixa a
 * ondulação passar. A regra prática é manter a janela vários múltiplos da
 * duração esperada do trânsito, e é por isso que ela é parâmetro do módulo, e
 * não constante escondida aqui.
 */

import type { LightCurve } from "./synthetic";

/**
 * Mediana de `tamanho` elementos de `buffer`, por seleção parcial.
 *
 * Ordenar a janela inteira a cada ponto custaria um `log` desnecessário: só o
 * elemento central interessa. O particionamento é o do quickselect, e reordena
 * `buffer` no lugar — quem chama já trata o buffer como descartável.
 */
export function medianInPlace(buffer: Float64Array, tamanho: number): number {
  const alvo = tamanho >> 1;

  let baixo = 0;
  let alto = tamanho - 1;

  while (baixo < alto) {
    const pivo = buffer[(baixo + alto) >> 1];
    let i = baixo;
    let j = alto;

    while (i <= j) {
      while (buffer[i] < pivo) i += 1;
      while (buffer[j] > pivo) j -= 1;

      if (i <= j) {
        const troca = buffer[i];
        buffer[i] = buffer[j];
        buffer[j] = troca;
        i += 1;
        j -= 1;
      }
    }

    if (alvo <= j) alto = j;
    else if (alvo >= i) baixo = i;
    else break;
  }

  if (tamanho % 2 === 1) return buffer[alvo];

  // Em janela par, o vizinho inferior da mediana é o maior valor à esquerda —
  // e a partição acima garante que ele esteja abaixo de `alvo`.
  let anterior = buffer[0];
  for (let i = 1; i < alvo; i += 1) {
    if (buffer[i] > anterior) anterior = buffer[i];
  }

  return (anterior + buffer[alvo]) / 2;
}

/**
 * Onde a série se parte.
 *
 * Devolve os índices que **começam** um trecho contínuo. Uma curva de um setor
 * só tem um trecho; uma emenda de vários setores tem um por setor, com semanas
 * de silêncio entre eles.
 *
 * Isto existe porque a mediana móvel desliza por índice, e não por tempo. Sem
 * cortar nos buracos, a janela do último ponto antes da lacuna mistura fluxo
 * medido semanas depois, com outro nível de base e outra sistemática — e o
 * achatamento sai errado justamente nas bordas, que é onde ele mais importa.
 */
export function segmentStarts(time: Float64Array, maxGapDays: number): number[] {
  const inicios = [0];

  for (let i = 1; i < time.length; i += 1) {
    if (time[i] - time[i - 1] > maxGapDays) inicios.push(i);
  }

  return inicios;
}

/** A tendência lenta da curva: a mediana móvel do fluxo. */
export function movingMedian(flux: Float64Array, windowPoints: number): Float64Array {
  const total = flux.length;
  const janela = Math.max(3, Math.min(windowPoints | 0, total));
  const metade = janela >> 1;

  const tendencia = new Float64Array(total);
  const buffer = new Float64Array(janela);

  for (let i = 0; i < total; i += 1) {
    // Nas bordas a janela encolhe em vez de deslizar para dentro: assim o
    // primeiro e o último ponto continuam sendo o centro da própria janela, e
    // a tendência não ganha um degrau artificial nas pontas.
    const inicio = Math.max(0, i - metade);
    const fim = Math.min(total - 1, i + metade);
    const tamanho = fim - inicio + 1;

    for (let k = 0; k < tamanho; k += 1) buffer[k] = flux[inicio + k];

    tendencia[i] = medianInPlace(buffer, tamanho);
  }

  return tendencia;
}

/**
 * Divide a curva pela própria tendência.
 *
 * Divisão, e não subtração: a profundidade de um trânsito é uma *fração* do
 * brilho da estrela, então dividir preserva o significado da medida quando o
 * nível de base muda. Subtrair daria profundidades diferentes para o mesmo
 * planeta em trechos mais brilhantes e mais fracos da curva.
 */
/**
 * Divide a curva pela própria tendência, um trecho contínuo de cada vez.
 *
 * Divisão, e não subtração: a profundidade de um trânsito é uma *fração* do
 * brilho da estrela, então dividir preserva o significado da medida quando o
 * nível de base muda. Subtrair daria profundidades diferentes para o mesmo
 * planeta em trechos mais brilhantes e mais fracos da curva.
 *
 * `maxGapDays` define o que conta como buraco. Meio dia é folgado para a
 * cadência de dois minutos e apertado o bastante para separar setores, que
 * ficam a semanas de distância.
 */
export function detrend(
  curve: LightCurve,
  windowPoints: number,
  maxGapDays = 0.5,
): LightCurve {
  const flux = new Float64Array(curve.flux.length);
  const inicios = segmentStarts(curve.time, maxGapDays);

  for (let s = 0; s < inicios.length; s += 1) {
    const inicio = inicios[s];
    const fim = s + 1 < inicios.length ? inicios[s + 1] : curve.flux.length;

    const trecho = curve.flux.slice(inicio, fim);
    const tendencia = movingMedian(trecho, windowPoints);

    for (let i = 0; i < trecho.length; i += 1) {
      // Tendência nula ou negativa não acontece em fotometria normalizada, mas
      // um arquivo corrompido não pode virar `Infinity` silencioso no gráfico.
      flux[inicio + i] = tendencia[i] > 0 ? trecho[i] / tendencia[i] : 1;
    }
  }

  return { time: curve.time, flux };
}

/**
 * Tendência por mediana móvel, ignorando os pontos marcados.
 *
 * A máscara é o que separa este achatamento do anterior. Sem ela, a janela que
 * passa sobre um trânsito inclui os pontos do trânsito no cálculo da linha de
 * base, e a tendência **desce junto** — o achatamento come parte da
 * profundidade que se quer medir. Com o trânsito mascarado, a base é estimada
 * só com o que está fora dele.
 *
 * Isso exige saber onde está o trânsito, que é justamente o que se procura.
 * Daí a análise ter dois passes: o primeiro acha um candidato sem máscara, o
 * segundo refaz a base ignorando o que o primeiro achou.
 */
export function maskedTrend(
  flux: Float64Array,
  windowPoints: number,
  mask?: Uint8Array,
): Float64Array {
  const total = flux.length;
  const janela = Math.max(3, Math.min(windowPoints | 0, total));
  const metade = janela >> 1;

  const tendencia = new Float64Array(total);
  const buffer = new Float64Array(janela);

  for (let i = 0; i < total; i += 1) {
    const inicio = Math.max(0, i - metade);
    const fim = Math.min(total - 1, i + metade);

    let usados = 0;

    for (let k = inicio; k <= fim; k += 1) {
      if (mask && mask[k]) continue;

      buffer[usados] = flux[k];
      usados += 1;
    }

    // Janela quase toda mascarada não sustenta uma estimativa. Cair para a
    // janela inteira é melhor que inventar uma base com três pontos — e o
    // trecho afetado é curto, porque trânsito ocupa pouco do período.
    if (usados < 3) {
      usados = 0;
      for (let k = inicio; k <= fim; k += 1) {
        buffer[usados] = flux[k];
        usados += 1;
      }
    }

    tendencia[i] = medianInPlace(buffer, usados);
  }

  return tendencia;
}

/**
 * Achatamento por trecho contínuo, com máscara opcional.
 *
 * É o `detrend` que a análise usa a partir do segundo passe. O primeiro passe
 * continua sem máscara, porque ainda não há candidato para mascarar.
 */
export function detrendMasked(
  curve: LightCurve,
  windowPoints: number,
  mask?: Uint8Array,
  maxGapDays = 0.5,
): LightCurve {
  const flux = new Float64Array(curve.flux.length);
  const inicios = segmentStarts(curve.time, maxGapDays);

  for (let s = 0; s < inicios.length; s += 1) {
    const inicio = inicios[s];
    const fim = s + 1 < inicios.length ? inicios[s + 1] : curve.flux.length;

    const trecho = curve.flux.slice(inicio, fim);
    const recorte = mask ? mask.slice(inicio, fim) : undefined;
    const tendencia = maskedTrend(trecho, windowPoints, recorte);

    for (let i = 0; i < trecho.length; i += 1) {
      flux[inicio + i] = tendencia[i] > 0 ? trecho[i] / tendencia[i] : 1;
    }
  }

  return { time: curve.time, flux };
}

/** Janela em pontos correspondente a uma janela em dias, dada a cadência. */
export function windowPointsFor(curve: LightCurve, windowDays: number): number {
  if (curve.time.length < 2) return 3;

  const cadencia = curve.time[1] - curve.time[0];

  return Math.max(3, Math.round(windowDays / cadencia));
}
