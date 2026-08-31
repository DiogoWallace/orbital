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
export function detrend(curve: LightCurve, windowPoints: number): LightCurve {
  const tendencia = movingMedian(curve.flux, windowPoints);
  const flux = new Float64Array(curve.flux.length);

  for (let i = 0; i < flux.length; i += 1) {
    // Tendência nula ou negativa não acontece em fotometria normalizada, mas
    // um arquivo corrompido não pode virar `Infinity` silencioso no gráfico.
    flux[i] = tendencia[i] > 0 ? curve.flux[i] / tendencia[i] : 1;
  }

  return { time: curve.time, flux };
}

/** Janela em pontos correspondente a uma janela em dias, dada a cadência. */
export function windowPointsFor(curve: LightCurve, windowDays: number): number {
  if (curve.time.length < 2) return 3;

  const cadencia = curve.time[1] - curve.time[0];

  return Math.max(3, Math.round(windowDays / cadencia));
}
