import { describe, expect, it } from "vitest";
import { analyse, foldCurve, signalToNoise } from "./analysis";
import { detrend, medianInPlace, movingMedian, windowPointsFor } from "./detrend";
import { generateLightCurve, randomSource, transitShape } from "./synthetic";

const CURTA = { baselineDays: 6, cadenceMinutes: 10 } as const;
const GRADE = { minPeriod: 0.6, maxPeriod: 2.5, periodCount: 400, bins: 120 };

describe("curva sintética", () => {
  it("é determinística: mesma semente, mesma curva", () => {
    const a = generateLightCurve({ ...CURTA, seed: 42 });
    const b = generateLightCurve({ ...CURTA, seed: 42 });

    expect(Array.from(a.flux)).toEqual(Array.from(b.flux));
  });

  it("muda de verdade quando a semente muda", () => {
    const a = generateLightCurve({ ...CURTA, seed: 1 });
    const b = generateLightCurve({ ...CURTA, seed: 2 });

    expect(Array.from(a.flux)).not.toEqual(Array.from(b.flux));
  });

  it("mantém o gerador dentro de [0, 1)", () => {
    const random = randomSource(99);

    for (let i = 0; i < 2000; i += 1) {
      const valor = random();

      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  it("desenha um trapézio: fundo plano, bordas inclinadas", () => {
    const periodo = 2;
    const duracao = 0.1;

    const centro = transitShape(1, periodo, 1, duracao, 0.2);
    const borda = transitShape(1 + duracao / 2 - 0.005, periodo, 1, duracao, 0.2);
    const fora = transitShape(1 + duracao, periodo, 1, duracao, 0.2);

    expect(centro).toBe(1);
    expect(borda).toBeGreaterThan(0);
    expect(borda).toBeLessThan(1);
    expect(fora).toBe(0);
  });

  it("gera curva sem trânsito quando o período é nulo", () => {
    const curva = generateLightCurve({
      ...CURTA,
      period: null,
      noise: 0,
      variabilityAmplitude: 0,
    });

    for (let i = 0; i < curva.flux.length; i += 1) {
      expect(curva.flux[i]).toBeCloseTo(1, 10);
    }
  });
});

describe("mediana", () => {
  it("acha o valor central em janela ímpar", () => {
    expect(medianInPlace(Float64Array.from([5, 1, 9, 3, 7]), 5)).toBe(5);
  });

  it("faz a média dos dois centrais em janela par", () => {
    expect(medianInPlace(Float64Array.from([8, 2, 6, 4]), 4)).toBe(5);
  });

  it("resiste a um ponto absurdo, ao contrário da média", () => {
    const comOutlier = Float64Array.from([1, 1, 1, 1, 1000]);

    expect(medianInPlace(comOutlier, 5)).toBe(1);
  });

  it("preserva o comprimento da série na mediana móvel", () => {
    const flux = Float64Array.from([1, 2, 3, 4, 5, 6, 7]);

    expect(movingMedian(flux, 3).length).toBe(flux.length);
  });
});

describe("achatamento", () => {
  it("remove a ondulação da estrela e preserva o trânsito", () => {
    const curva = generateLightCurve({
      ...CURTA,
      period: 1.3,
      depth: 0.02,
      durationHours: 2,
      epoch: 0.4,
      noise: 0.0005,
      variabilityAmplitude: 0.02,
      variabilityPeriod: 3,
    });

    const achatada = detrend(curva, windowPointsFor(curva, 0.5));

    const espalhamento = (serie: Float64Array) => {
      let media = 0;
      for (const valor of serie) media += valor;
      media /= serie.length;

      let soma = 0;
      for (const valor of serie) soma += (valor - media) ** 2;

      return Math.sqrt(soma / serie.length);
    };

    // A variabilidade era maior que o trânsito; depois de achatar, o que sobra
    // de espalhamento é dominado pelo próprio trânsito e pelo ruído.
    expect(espalhamento(achatada.flux)).toBeLessThan(espalhamento(curva.flux) / 2);

    // E o trânsito continua lá: existe ponto claramente abaixo da base.
    expect(Math.min(...achatada.flux)).toBeLessThan(0.99);
  });

  it("converte janela em dias para pontos usando a cadência", () => {
    const curva = generateLightCurve({ baselineDays: 2, cadenceMinutes: 10 });

    // Meio dia a cada dez minutos são 72 pontos.
    expect(windowPointsFor(curva, 0.5)).toBe(72);
  });
});

describe("dobra em fase", () => {
  it("ordena por fase e centra o trânsito no zero", () => {
    const curva = generateLightCurve({
      ...CURTA,
      period: 1.3,
      depth: 0.03,
      durationHours: 2,
      epoch: 0.4,
      noise: 0.0005,
      variabilityAmplitude: 0,
    });

    const dobrada = foldCurve(curva, 1.3, 0.4);

    expect(dobrada.phase.length).toBe(curva.time.length);

    for (let i = 1; i < dobrada.phase.length; i += 1) {
      expect(dobrada.phase[i]).toBeGreaterThanOrEqual(dobrada.phase[i - 1]);
    }

    expect(dobrada.phase[0]).toBeGreaterThanOrEqual(-0.5);
    expect(dobrada.phase[dobrada.phase.length - 1]).toBeLessThan(0.5);

    // O ponto mais escuro tem de cair perto da fase zero, que é onde o
    // trânsito foi centrado.
    let indiceMinimo = 0;
    for (let i = 1; i < dobrada.flux.length; i += 1) {
      if (dobrada.flux[i] < dobrada.flux[indiceMinimo]) indiceMinimo = i;
    }

    expect(Math.abs(dobrada.phase[indiceMinimo])).toBeLessThan(0.05);
  });
});

describe("relação sinal/ruído", () => {
  it("separa um trânsito real de uma caixa achada no ruído", () => {
    const comSinal = analyse(
      generateLightCurve({
        ...CURTA,
        period: 1.3,
        depth: 0.02,
        durationHours: 2,
        epoch: 0.4,
        noise: 0.001,
        variabilityAmplitude: 0,
      }),
      { bls: GRADE },
    );

    const semSinal = analyse(
      generateLightCurve({
        ...CURTA,
        period: null,
        noise: 0.001,
        variabilityAmplitude: 0,
        seed: 5150,
      }),
      { bls: GRADE },
    );

    expect(comSinal.snr).toBeGreaterThan(10);
    expect(semSinal.snr).toBeLessThan(comSinal.snr / 3);
  });

  it("cresce quando o trânsito fica mais fundo", () => {
    const medir = (depth: number) =>
      analyse(
        generateLightCurve({
          ...CURTA,
          period: 1.3,
          depth,
          durationHours: 2,
          epoch: 0.4,
          noise: 0.001,
          variabilityAmplitude: 0,
        }),
        { bls: GRADE },
      ).snr;

    expect(medir(0.03)).toBeGreaterThan(medir(0.008));
  });

  it("devolve zero quando não há candidato", () => {
    const curva = generateLightCurve({ ...CURTA, period: null });

    expect(
      signalToNoise(curva, {
        period: 1,
        power: 0,
        depth: 0.01,
        // Duração maior que o período: nenhum ponto fica de fora.
        durationDays: 2,
        epoch: 0,
      }),
    ).toBe(0);
  });
});

describe("caminho completo", () => {
  it("vai da curva crua ao candidato medido", () => {
    const resultado = analyse(
      generateLightCurve({
        ...CURTA,
        period: 1.3,
        depth: 0.02,
        durationHours: 2,
        epoch: 0.4,
        noise: 0.0008,
        variabilityAmplitude: 0.01,
        variabilityPeriod: 4,
      }),
      { detrendWindowDays: 0.5, bls: GRADE },
    );

    expect(resultado.candidate).not.toBeNull();
    expect(resultado.candidate!.period).toBeGreaterThan(1.25);
    expect(resultado.candidate!.period).toBeLessThan(1.35);
    expect(resultado.folded).not.toBeNull();
    expect(resultado.folded!.phase.length).toBe(resultado.detrended.time.length);
    expect(resultado.periodogram.power.length).toBe(GRADE.periodCount);
    expect(resultado.snr).toBeGreaterThan(8);
  });
});
