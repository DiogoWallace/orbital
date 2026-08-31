import type { ChartPoint } from "@/components/data/LineChart";

/**
 * Reduz uma série para caber num gráfico SVG **sem perder o que importa**.
 *
 * Isto não é otimização: é correção. O `LineChart` desenha um nó por ponto, e
 * uma curva de luz tem milhares deles. A saída óbvia — pegar um ponto a cada
 * N — é a errada, e é errada de um jeito perigoso: um trânsito de duas horas e
 * meia numa série de 27 dias ocupa menos de meio por cento da curva, e some
 * inteiro entre as amostras. O gráfico fica limpo, rápido e mentiroso.
 *
 * A saída certa é guardar **o mínimo e o máximo de cada balde**. O trânsito é
 * exatamente o mínimo local, então ele sobrevive por construção, e o desenho
 * vira a envoltória da curva — que é o que se quer ver numa série ruidosa.
 *
 * Os dois pontos de cada balde saem em ordem de x, para a linha não voltar
 * sobre si mesma.
 */
export function decimate(
  x: Float64Array,
  y: Float64Array,
  buckets: number,
): ChartPoint[] {
  const total = Math.min(x.length, y.length);

  if (total === 0) return [];

  const alvo = Math.max(1, buckets | 0);

  // Com poucos pontos por balde a decimação só acrescentaria trabalho: dois
  // pontos por balde já seriam a série inteira.
  if (total <= alvo * 2) {
    const saida: ChartPoint[] = new Array(total);

    for (let i = 0; i < total; i += 1) saida[i] = { x: x[i], y: y[i] };

    return saida;
  }

  const tamanho = total / alvo;
  const saida: ChartPoint[] = [];

  for (let b = 0; b < alvo; b += 1) {
    const inicio = Math.floor(b * tamanho);
    const fim = Math.min(total, Math.floor((b + 1) * tamanho));

    if (fim <= inicio) continue;

    let iMin = inicio;
    let iMax = inicio;

    for (let i = inicio + 1; i < fim; i += 1) {
      if (y[i] < y[iMin]) iMin = i;
      if (y[i] > y[iMax]) iMax = i;
    }

    const primeiro = Math.min(iMin, iMax);
    const segundo = Math.max(iMin, iMax);

    saida.push({ x: x[primeiro], y: y[primeiro] });

    if (segundo !== primeiro) {
      saida.push({ x: x[segundo], y: y[segundo] });
    }
  }

  return saida;
}
