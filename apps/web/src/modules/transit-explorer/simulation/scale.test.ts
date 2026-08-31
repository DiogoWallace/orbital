import { describe, expect, it } from "vitest";
import { analyse } from "./analysis";
import { generateLightCurve } from "./synthetic";

/**
 * Aferição em escala real.
 *
 * Os outros testes usam curvas curtas para a suíte rodar em milissegundos, e
 * um método pode funcionar em 720 pontos e desmontar em vinte mil — por
 * arredondamento acumulado, por binagem grosseira demais, por trânsito raso
 * que some no ruído. Este teste roda o caminho inteiro sobre um setor do
 * tamanho de um setor do TESS.
 *
 * Não há afirmação de tempo aqui: cronômetro em suíte de testes vira falha
 * intermitente na primeira máquina lenta. A medição foi feita à parte, e o
 * número está registrado abaixo para quem for mexer nisto saber o que esperar.
 *
 *     19.440 pontos · grade de 2.000 períodos · 200 divisões de fase
 *     achatamento + busca + dobra + relação sinal/ruído ≈ 0,6 s
 *
 * É o que sustenta a decisão de rodar a análise no cliente (ADR 0007): abaixo
 * de um segundo, dentro de um Web Worker, isto é uma barra de progresso — não
 * um serviço em outra linguagem.
 */
describe("escala de um setor do TESS", () => {
  const curva = generateLightCurve({
    baselineDays: 27,
    cadenceMinutes: 2,
    period: 3.2,
    // Oito partes em mil: raso o bastante para não ser um caso fácil.
    depth: 0.008,
    durationHours: 2.5,
    epoch: 1.1,
    noise: 0.0012,
    variabilityAmplitude: 0.003,
    variabilityPeriod: 8.4,
  });

  const resultado = analyse(curva, {
    detrendWindowDays: 0.5,
    bls: { minPeriod: 0.5, maxPeriod: 12, periodCount: 2000, bins: 200 },
  });

  it("trabalha sobre a quantidade de pontos de um setor real", () => {
    expect(curva.time.length).toBeGreaterThan(19_000);
  });

  it("recupera o período com precisão muito melhor que um por cento", () => {
    expect(resultado.candidate).not.toBeNull();
    expect(resultado.candidate!.period).toBeGreaterThan(3.19);
    expect(resultado.candidate!.period).toBeLessThan(3.21);
  });

  it("mede duração e profundidade próximas das injetadas", () => {
    // A caixa é mais larga que o trapézio e engole entrada e saída, então a
    // profundidade sai por baixo — comportamento conhecido do método, não erro.
    expect(resultado.candidate!.depth).toBeGreaterThan(0.006);
    expect(resultado.candidate!.depth).toBeLessThan(0.009);

    const horas = resultado.candidate!.durationDays * 24;

    expect(horas).toBeGreaterThan(1.5);
    expect(horas).toBeLessThan(3.5);
  });

  it("chega a uma relação sinal/ruído inequívoca", () => {
    expect(resultado.snr).toBeGreaterThan(20);
  });
});
