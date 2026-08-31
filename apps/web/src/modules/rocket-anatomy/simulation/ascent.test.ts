import { describe, expect, it } from "vitest";
import {
  airDensity,
  ambientPressure,
  buildEngine,
  characteristicVelocity,
  deriveReadout,
  exitMachFor,
  initialState,
  step,
  thrustAt,
  type AscentParams,
} from "./ascent";

/**
 * Um veículo de referência plausível, usado como base dos testes.
 *
 * A garganta é o número que decide se ele sai do chão: com 132 t na plataforma
 * o peso é de ~1,3 MN, e uma garganta de 500 cm² a esta pressão entrega ~0,8 MN.
 * Foi assim que a primeira versão destes testes falhou em bloco — não por erro
 * de física, mas por um veículo que nunca decolava.
 */
const BASE: AscentParams = {
  throatArea: 1000,
  chamberPressure: 100,
  expansionRatio: 16,
  propellantMass: 120,
  dryMass: 12,
  throttle: 100,
};

function voar(params: AscentParams, segundos: number, dt = 0.05) {
  const engine = buildEngine(params);
  let state = initialState(params);

  for (let i = 0; i < Math.round(segundos / dt); i += 1) {
    state = step(state, dt, engine, params);
  }

  return { state, engine };
}

describe("tubeira", () => {
  it("resolve o Mach de saída de forma monotônica na razão de expansão", () => {
    const pequena = exitMachFor(5);
    const media = exitMachFor(16);
    const grande = exitMachFor(60);

    expect(pequena).toBeGreaterThan(1);
    expect(media).toBeGreaterThan(pequena);
    expect(grande).toBeGreaterThan(media);
  });

  it("mantém a velocidade característica na faixa física do propelente", () => {
    // Combinações químicas usuais ficam entre ~1500 e ~2400 m/s. Um valor fora
    // disso significa constante trocada, não motor melhor.
    expect(characteristicVelocity()).toBeGreaterThan(1500);
    expect(characteristicVelocity()).toBeLessThan(2400);
  });

  it("entrega mais empuxo no vácuo do que ao nível do mar", () => {
    const engine = buildEngine(BASE);

    expect(thrustAt(engine, 0)).toBeGreaterThan(thrustAt(engine, 101325));
  });

  it("penaliza a tubeira grande demais para o nível do mar", () => {
    const curta = buildEngine({ ...BASE, expansionRatio: 8 });
    const longa = buildEngine({ ...BASE, expansionRatio: 60 });

    // No solo a razão grande sobre-expande e perde; no vácuo ela ganha. É o
    // motivo de motor de primeiro estágio e motor de vácuo terem sinos
    // diferentes, e é o que o módulo quer deixar visível.
    expect(thrustAt(longa, 101325)).toBeLessThan(thrustAt(curta, 101325));
    expect(thrustAt(longa, 0)).toBeGreaterThan(thrustAt(curta, 0));
  });
});

describe("atmosfera", () => {
  it("parte das condições de nível do mar e decai com a altitude", () => {
    expect(ambientPressure(0)).toBeCloseTo(101325, 0);
    expect(airDensity(0)).toBeCloseTo(1.225, 3);
    expect(ambientPressure(50_000)).toBeLessThan(ambientPressure(10_000));
  });

  it("não devolve valores absurdos abaixo do nível do mar", () => {
    expect(ambientPressure(-500)).toBe(ambientPressure(0));
  });
});

describe("integração", () => {
  it("é determinística: mesma entrada, mesma trajetória", () => {
    const a = voar(BASE, 60);
    const b = voar(BASE, 60);

    expect(a.state.altitude).toBe(b.state.altitude);
    expect(a.state.velocity).toBe(b.state.velocity);
  });

  it("queima o propelente na vazão do motor", () => {
    const { engine } = voar(BASE, 1);
    const duracaoEsperada = (BASE.propellantMass * 1000) / engine.massFlow;

    const antes = voar(BASE, duracaoEsperada * 0.9);
    const depois = voar(BASE, duracaoEsperada * 1.1);

    expect(antes.state.propellant).toBeGreaterThan(0);
    expect(depois.state.propellant).toBe(0);
  });

  it("registra o instante do fim da queima uma vez só", () => {
    const { engine } = voar(BASE, 1);
    const duracao = (BASE.propellantMass * 1000) / engine.massFlow;

    const voo = voar(BASE, duracao * 1.5);

    expect(voo.state.burnoutTime).not.toBeNull();
    expect(voo.state.burnoutTime).toBeGreaterThan(duracao * 0.9);
    expect(voo.state.burnoutTime).toBeLessThan(duracao * 1.1);
  });

  it("sobe quando o empuxo supera o peso", () => {
    const voo = voar(BASE, 30);

    expect(voo.state.altitude).toBeGreaterThan(0);
    expect(voo.state.velocity).toBeGreaterThan(0);
  });

  it("não decola quando o motor é pequeno demais para a massa", () => {
    // Garganta minúscula com veículo pesado: empuxo bem abaixo do peso.
    const voo = voar({ ...BASE, throatArea: 200, propellantMass: 400, dryMass: 60 }, 20);

    expect(voo.state.altitude).toBe(0);
    expect(voo.state.landed).toBe(true);
  });

  it("guarda a maior pressão dinâmica do voo", () => {
    const voo = voar(BASE, 90);

    expect(voo.state.maxDynamicPressure).toBeGreaterThan(0);

    const q = 0.5 * airDensity(voo.state.altitude) * voo.state.velocity ** 2;

    // O pico fica para trás: a densidade cai mais rápido do que a velocidade
    // cresce, então o valor corrente já é menor que o máximo registrado.
    expect(voo.state.maxDynamicPressure).toBeGreaterThanOrEqual(q);
  });

  it("converge com o passo: metade do passo não muda o resultado de forma relevante", () => {
    const grosso = voar(BASE, 60, 0.1).state.altitude;
    const fino = voar(BASE, 60, 0.05).state.altitude;

    expect(Math.abs(grosso - fino) / fino).toBeLessThan(0.01);
  });
});

describe("leitura", () => {
  it("converte para as unidades do painel", () => {
    const params = BASE;
    const engine = buildEngine(params);
    const voo = voar(params, 40);
    const leitura = deriveReadout(voo.state, engine, params);

    expect(leitura.altitude).toBeCloseTo(voo.state.altitude / 1000, 6);
    expect(leitura.velocity).toBeCloseTo(voo.state.velocity / 1000, 6);
    expect(leitura.mass).toBeCloseTo((params.dryMass * 1000 + voo.state.propellant) / 1000, 6);
  });

  it("mantém o impulso específico na faixa física enquanto queima", () => {
    const params = BASE;
    const leitura = deriveReadout(voar(params, 40).state, buildEngine(params), params);

    expect(leitura.isp).toBeGreaterThan(200);
    expect(leitura.isp).toBeLessThan(400);
  });

  it("zera empuxo e impulso específico depois do fim da queima", () => {
    const engine = buildEngine(BASE);
    const duracao = (BASE.propellantMass * 1000) / engine.massFlow;
    const leitura = deriveReadout(voar(BASE, duracao * 1.2).state, engine, BASE);

    expect(leitura.thrust).toBe(0);
    expect(leitura.isp).toBe(0);
  });

  it("mede a aceleração sentida a bordo, sem a gravidade", () => {
    const engine = buildEngine(BASE);
    const inicial = initialState(BASE);
    const leitura = deriveReadout(inicial, engine, BASE);

    // Parado na plataforma, sem arrasto: a leitura é empuxo sobre massa. Se a
    // gravidade entrasse aqui, o número seria menor — e o acelerômetro real
    // não a mede.
    const esperado = thrustAt(engine, 101325) / (BASE.dryMass * 1000 + inicial.propellant) / 9.80665;

    expect(leitura.acceleration).toBeCloseTo(esperado, 6);
  });
});
