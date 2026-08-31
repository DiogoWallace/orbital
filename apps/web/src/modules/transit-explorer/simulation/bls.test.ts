import { describe, expect, it } from "vitest";
import { boxLeastSquares } from "./bls";
import { detrend, windowPointsFor } from "./detrend";
import { generateLightCurve } from "./synthetic";

/**
 * Curvas curtas de propósito: a suíte precisa rodar em milissegundos, e o que
 * está sob teste é o método, não o volume. Cinco dias a cada dez minutos dão
 * 720 pontos — suficientes para vários trânsitos de um período de 1,4 dia.
 */
const CURTA = {
  baselineDays: 5,
  cadenceMinutes: 10,
  variabilityAmplitude: 0,
} as const;

const GRADE = { minPeriod: 0.6, maxPeriod: 2.5, periodCount: 400, bins: 120 };

function achatar(curva: ReturnType<typeof generateLightCurve>) {
  return detrend(curva, windowPointsFor(curva, 0.5));
}

describe("busca de período", () => {
  it("recupera o período de um trânsito injetado", () => {
    const periodo = 1.4;
    const curva = generateLightCurve({
      ...CURTA,
      period: periodo,
      depth: 0.02,
      durationHours: 2,
      epoch: 0.35,
      noise: 0.0008,
    });

    const resultado = boxLeastSquares(curva, GRADE);

    expect(resultado.best).not.toBeNull();
    expect(resultado.best!.period).toBeGreaterThan(periodo * 0.97);
    expect(resultado.best!.period).toBeLessThan(periodo * 1.03);
  });

  it("mede a profundidade injetada dentro de uma margem razoável", () => {
    const profundidade = 0.02;
    const curva = generateLightCurve({
      ...CURTA,
      period: 1.4,
      depth: profundidade,
      durationHours: 2,
      epoch: 0.35,
      noise: 0.0008,
    });

    const { best } = boxLeastSquares(curva, GRADE);

    // A caixa do BLS é mais larga que o trânsito trapezoidal — ela engole a
    // entrada e a saída, onde o brilho ainda não caiu tudo. A profundidade
    // medida sai por baixo por construção, e o teste registra isso em vez de
    // fingir precisão que o método não tem.
    expect(best!.depth).toBeGreaterThan(profundidade * 0.5);
    expect(best!.depth).toBeLessThan(profundidade * 1.3);
  });

  it("encontra o centro do trânsito", () => {
    const periodo = 1.4;
    const epoca = 0.35;
    const curva = generateLightCurve({
      ...CURTA,
      period: periodo,
      depth: 0.02,
      durationHours: 2,
      epoch: epoca,
      noise: 0.0008,
    });

    const { best } = boxLeastSquares(curva, GRADE);

    // A época volta modulada pelo período: qualquer trânsito serve, então o
    // que se compara é a fase.
    const fase = (((best!.epoch - epoca) % periodo) + periodo) % periodo;
    const distancia = Math.min(fase, periodo - fase);

    expect(distancia).toBeLessThan(best!.durationDays);
  });

  it("prefere o período verdadeiro ao dobro dele", () => {
    const periodo = 1.2;
    const curva = generateLightCurve({
      ...CURTA,
      baselineDays: 8,
      period: periodo,
      depth: 0.02,
      durationHours: 2,
      epoch: 0.4,
      noise: 0.0008,
    });

    const resultado = boxLeastSquares(curva, {
      minPeriod: 0.6,
      maxPeriod: 3,
      periodCount: 600,
      bins: 120,
    });

    // Dobrar em 2P espalha os trânsitos por duas fases distintas e a caixa
    // captura só metade deles. O alias existe, mas tem de perder.
    expect(resultado.best!.period).toBeLessThan(periodo * 1.5);
  });
});

describe("ceticismo", () => {
  it("não inventa trânsito onde só há ruído", () => {
    const comSinal = achatar(
      generateLightCurve({
        ...CURTA,
        period: 1.4,
        depth: 0.02,
        durationHours: 2,
        epoch: 0.35,
        noise: 0.001,
      }),
    );

    const semSinal = achatar(
      generateLightCurve({ ...CURTA, period: null, noise: 0.001, seed: 7 }),
    );

    const comPico = boxLeastSquares(comSinal, GRADE);
    const semPico = boxLeastSquares(semSinal, GRADE);

    // O BLS devolve um "melhor" período sempre — ele é uma busca, não um juiz.
    // O que precisa separar os dois casos é a altura do pico.
    expect(semPico.best).not.toBeNull();
    expect(comPico.best!.power).toBeGreaterThan(semPico.best!.power * 3);
  });

  it("ignora um aumento de brilho da mesma magnitude", () => {
    const curva = generateLightCurve({
      ...CURTA,
      period: 1.4,
      depth: -0.02,
      durationHours: 2,
      epoch: 0.35,
      noise: 0.0008,
    });

    const claro = boxLeastSquares(achatar(curva), GRADE);
    const escuro = boxLeastSquares(
      achatar(
        generateLightCurve({
          ...CURTA,
          period: 1.4,
          depth: 0.02,
          durationHours: 2,
          epoch: 0.35,
          noise: 0.0008,
        }),
      ),
      GRADE,
    );

    // Profundidade negativa é clarão, não trânsito. O método tem de ficar
    // perto do nível de ruído nesse caso.
    expect(claro.best!.power).toBeLessThan(escuro.best!.power / 2);
  });
});

describe("determinismo e forma da saída", () => {
  it("devolve exatamente o mesmo resultado em duas execuções", () => {
    const curva = generateLightCurve({ ...CURTA, period: 1.4, depth: 0.02 });

    const a = boxLeastSquares(curva, GRADE);
    const b = boxLeastSquares(curva, GRADE);

    expect(a.best!.period).toBe(b.best!.period);
    expect(a.best!.power).toBe(b.best!.power);
    expect(Array.from(a.power)).toEqual(Array.from(b.power));
  });

  it("entrega o periodograma em período crescente", () => {
    const curva = generateLightCurve({ ...CURTA, period: 1.4, depth: 0.02 });
    const { periods } = boxLeastSquares(curva, GRADE);

    expect(periods.length).toBe(GRADE.periodCount);
    expect(periods[0]).toBeCloseTo(GRADE.minPeriod, 6);
    expect(periods[periods.length - 1]).toBeCloseTo(GRADE.maxPeriod, 6);

    for (let i = 1; i < periods.length; i += 1) {
      expect(periods[i]).toBeGreaterThan(periods[i - 1]);
    }
  });

  it("desiste quando há menos pontos que divisões de fase", () => {
    const curva = generateLightCurve({ baselineDays: 0.05, cadenceMinutes: 10 });
    const resultado = boxLeastSquares(curva, { ...GRADE, bins: 200 });

    expect(resultado.best).toBeNull();
  });
});
