import { describe, expect, it } from "vitest";
import {
  BODY_RADIUS,
  circularSpeed,
  deriveElements,
  gravitationalParameter,
  initialState,
  OrbitSimulator,
  step,
  type OrbitParams,
} from "./orbit";

/**
 * A física roda sem React (ADR 0007), e é por isso que ela pode ser testada
 * assim: entrada, saída, valor conhecido da literatura.
 */

const leo: OrbitParams = {
  centralMass: 1,
  altitude: 400,
  speedFactor: 1,
  flightAngle: 0,
};

describe("velocidade circular", () => {
  it("reproduz o valor conhecido para órbita baixa da Terra", () => {
    const mu = gravitationalParameter(1);
    const v = circularSpeed(mu, BODY_RADIUS + 400);

    // Literatura: ~7,67 km/s a 400 km de altitude.
    expect(v).toBeGreaterThan(7.6);
    expect(v).toBeLessThan(7.75);
  });
});

describe("elementos orbitais", () => {
  it("descreve órbita circular com excentricidade próxima de zero", () => {
    const mu = gravitationalParameter(1);
    const elements = deriveElements(initialState(leo), mu);

    expect(elements.eccentricity).toBeCloseTo(0, 6);
    expect(elements.apoapsis).toBeCloseTo(400, 3);
    expect(elements.periapsis).toBeCloseTo(400, 3);
    expect(elements.escaping).toBe(false);
  });

  it("reproduz o período de ~92,5 min em órbita baixa", () => {
    const mu = gravitationalParameter(1);
    const { period } = deriveElements(initialState(leo), mu);

    expect(period).toBeGreaterThan(92);
    expect(period).toBeLessThan(93);
  });

  it("identifica escape acima de raiz de dois vezes a velocidade circular", () => {
    const mu = gravitationalParameter(1);

    const abaixo = deriveElements(
      initialState({ ...leo, speedFactor: 1.41 }),
      mu,
    );
    const acima = deriveElements(
      initialState({ ...leo, speedFactor: 1.42 }),
      mu,
    );

    expect(abaixo.escaping).toBe(false);
    expect(acima.escaping).toBe(true);
    expect(acima.eccentricity).toBeGreaterThan(1);
  });

  it("gera órbita elíptica com apoapsis acima da altitude inicial", () => {
    const mu = gravitationalParameter(1);
    const elements = deriveElements(
      initialState({ ...leo, speedFactor: 1.2 }),
      mu,
    );

    expect(elements.eccentricity).toBeGreaterThan(0);
    expect(elements.eccentricity).toBeLessThan(1);
    expect(elements.apoapsis).toBeGreaterThan(400);
    expect(elements.periapsis).toBeCloseTo(400, 0);
  });
});

describe("integrador", () => {
  it("conserva energia ao longo de uma órbita completa", () => {
    const mu = gravitationalParameter(1);
    let state = initialState(leo);
    const inicial = deriveElements(state, mu).specificEnergy;

    // ~92,5 min em passos de 1 s: uma volta inteira.
    for (let i = 0; i < 5560; i += 1) {
      state = step(state, 1, mu);
    }

    const final = deriveElements(state, mu).specificEnergy;

    // Verlet é simplético: o desvio fica em ruído numérico, não em deriva.
    expect(Math.abs((final - inicial) / inicial)).toBeLessThan(1e-6);
  });

  it("volta ao ponto de partida depois de um período", () => {
    const mu = gravitationalParameter(1);
    const periodoSegundos = deriveElements(initialState(leo), mu).period * 60;

    let state = initialState(leo);
    const passos = Math.round(periodoSegundos);

    for (let i = 0; i < passos; i += 1) {
      state = step(state, periodoSegundos / passos, mu);
    }

    expect(state.position.x).toBeCloseTo(BODY_RADIUS + 400, 0);
    expect(state.position.y).toBeCloseTo(0, 0);
  });

  it("detecta impacto em trajetória suborbital", () => {
    const simulator = new OrbitSimulator({ ...leo, speedFactor: 0.5 });

    for (let i = 0; i < 4000 && !simulator.current.impacted; i += 1) {
      simulator.advance(1, 1);
    }

    expect(simulator.current.impacted).toBe(true);
  });

  it("é determinístico: mesmos parâmetros, mesmo resultado", () => {
    const a = new OrbitSimulator(leo);
    const b = new OrbitSimulator(leo);

    for (let i = 0; i < 500; i += 1) {
      a.advance(2, 4);
      b.advance(2, 4);
    }

    expect(a.current.position).toEqual(b.current.position);
    expect(a.current.velocity).toEqual(b.current.velocity);
  });
});
