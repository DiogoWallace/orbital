import { describe, expect, it } from "vitest";
import { decimate } from "./decimate";
import { generateLightCurve } from "../simulation/synthetic";

describe("decimação para desenho", () => {
  it("preserva o trânsito, que a amostragem simples apagaria", () => {
    const curva = generateLightCurve({
      baselineDays: 27,
      cadenceMinutes: 2,
      period: 3.2,
      depth: 0.02,
      durationHours: 2.5,
      epoch: 1.1,
      noise: 0.0004,
      variabilityAmplitude: 0,
    });

    const baldes = 360;
    const reduzida = decimate(curva.time, curva.flux, baldes);

    const minimoOriginal = Math.min(...curva.flux);
    const minimoReduzido = Math.min(...reduzida.map((ponto) => ponto.y));

    // O mínimo da curva é o fundo do trânsito. Ele tem de sobreviver exatamente.
    expect(minimoReduzido).toBe(minimoOriginal);

    // E o contraste: amostrar um ponto a cada N, na mesma taxa de redução,
    // perde o trânsito quase inteiro. É este o motivo de a função existir.
    const passo = Math.floor(curva.flux.length / baldes);
    let minimoAmostrado = Infinity;
    for (let i = 0; i < curva.flux.length; i += passo) {
      if (curva.flux[i] < minimoAmostrado) minimoAmostrado = curva.flux[i];
    }

    expect(minimoAmostrado).toBeGreaterThan(minimoReduzido);
  });

  it("respeita o teto de baldes", () => {
    const curva = generateLightCurve({ baselineDays: 27, cadenceMinutes: 2 });
    const reduzida = decimate(curva.time, curva.flux, 300);

    // No máximo dois pontos por balde: o mínimo e o máximo.
    expect(reduzida.length).toBeLessThanOrEqual(600);
    expect(reduzida.length).toBeGreaterThan(300);
  });

  it("mantém a ordem crescente em x", () => {
    const curva = generateLightCurve({ baselineDays: 10, cadenceMinutes: 2 });
    const reduzida = decimate(curva.time, curva.flux, 120);

    for (let i = 1; i < reduzida.length; i += 1) {
      expect(reduzida[i].x).toBeGreaterThanOrEqual(reduzida[i - 1].x);
    }
  });

  it("devolve a série intacta quando ela já é pequena", () => {
    const x = Float64Array.from([0, 1, 2, 3]);
    const y = Float64Array.from([1, 2, 3, 4]);

    expect(decimate(x, y, 100)).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 },
    ]);
  });

  it("aguenta série vazia", () => {
    expect(decimate(new Float64Array(0), new Float64Array(0), 50)).toEqual([]);
  });
});
