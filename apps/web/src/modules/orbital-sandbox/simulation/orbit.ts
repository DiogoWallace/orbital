/**
 * Mecânica orbital de dois corpos — TypeScript puro, sem React (ADR 0007).
 *
 * Unidades: quilômetro e segundo. Massa em massas terrestres na entrada do
 * usuário, convertida para o parâmetro gravitacional padrão μ = GM internamente.
 * Escolher km em vez de metros mantém os números na faixa que a precisão de
 * ponto flutuante trata bem e evita expoentes gigantes nos gráficos.
 *
 * O modelo assume dois corpos pontuais: sem arrasto, sem achatamento do corpo
 * central, sem terceiro corpo. Suficiente para a geometria da órbita,
 * insuficiente para planejar uma missão.
 */

/** Versão do modelo físico, gravada com cada execução salva. */
export const MODEL_VERSION = "1.0.0";

/** Constante gravitacional em km³·kg⁻¹·s⁻². */
const G = 6.6743e-20;

/** Massa da Terra (kg) — unidade de referência do parâmetro `centralMass`. */
const EARTH_MASS = 5.9722e24;

/** Raio da Terra (km) — define a superfície e, portanto, a altitude. */
export const BODY_RADIUS = 6371;

export interface Vec2 {
  x: number;
  y: number;
}

export interface OrbitParams {
  /** Massa do corpo central, em massas terrestres. */
  centralMass: number;
  /** Altitude inicial acima da superfície, em km. */
  altitude: number;
  /** Velocidade inicial como múltiplo da velocidade circular local. */
  speedFactor: number;
  /** Ângulo da velocidade em relação ao horizonte local, em graus. */
  flightAngle: number;
}

export interface OrbitState {
  position: Vec2;
  velocity: Vec2;
  /** Tempo simulado desde o início, em segundos. */
  time: number;
  /** True quando a trajetória cruzou a superfície do corpo central. */
  impacted: boolean;
}

export interface OrbitElements {
  /** Altitude do ponto mais distante, em km. `Infinity` se a órbita é aberta. */
  apoapsis: number;
  /** Altitude do ponto mais próximo, em km. Negativa significa impacto. */
  periapsis: number;
  eccentricity: number;
  /** Período orbital em minutos. `Infinity` se a órbita é aberta. */
  period: number;
  /** Energia específica em MJ/kg (numericamente igual a km²/s²). */
  specificEnergy: number;
  /** Altitude atual, em km. */
  altitude: number;
  /** Velocidade atual, em km/s. */
  speed: number;
  /** `true` quando a energia específica é positiva: a trajetória não retorna. */
  escaping: boolean;
}

export function gravitationalParameter(centralMass: number): number {
  return G * EARTH_MASS * centralMass;
}

/** Velocidade que manteria órbita circular a uma distância `radius` do centro. */
export function circularSpeed(mu: number, radius: number): number {
  return Math.sqrt(mu / radius);
}

export function initialState(params: OrbitParams): OrbitState {
  const mu = gravitationalParameter(params.centralMass);
  const radius = BODY_RADIUS + params.altitude;
  const speed = params.speedFactor * circularSpeed(mu, radius);
  const gamma = (params.flightAngle * Math.PI) / 180;

  // Começamos sobre o eixo x, com a velocidade decomposta entre a direção
  // radial (sin γ) e a tangencial (cos γ).
  return {
    position: { x: radius, y: 0 },
    velocity: { x: speed * Math.sin(gamma), y: speed * Math.cos(gamma) },
    time: 0,
    impacted: false,
  };
}

function acceleration(position: Vec2, mu: number): Vec2 {
  const r2 = position.x * position.x + position.y * position.y;
  const r = Math.sqrt(r2);
  const factor = -mu / (r2 * r);

  return { x: factor * position.x, y: factor * position.y };
}

/**
 * Um passo de integração por Velocity Verlet.
 *
 * Verlet, e não Euler, porque é simplético: a energia não deriva ao longo de
 * milhares de passos. Com Euler, uma órbita circular vira uma espiral em poucos
 * minutos de simulação — o usuário veria um artefato numérico e acharia que é
 * física.
 */
export function step(state: OrbitState, dt: number, mu: number): OrbitState {
  if (state.impacted) return state;

  const a0 = acceleration(state.position, mu);

  const position: Vec2 = {
    x: state.position.x + state.velocity.x * dt + 0.5 * a0.x * dt * dt,
    y: state.position.y + state.velocity.y * dt + 0.5 * a0.y * dt * dt,
  };

  const a1 = acceleration(position, mu);

  const velocity: Vec2 = {
    x: state.velocity.x + 0.5 * (a0.x + a1.x) * dt,
    y: state.velocity.y + 0.5 * (a0.y + a1.y) * dt,
  };

  const radius = Math.hypot(position.x, position.y);

  return {
    position,
    velocity,
    time: state.time + dt,
    impacted: radius <= BODY_RADIUS,
  };
}

/**
 * Elementos orbitais a partir do estado instantâneo.
 *
 * Calculados analiticamente, não medidos ao longo da trajetória: assim o
 * apoapsis aparece correto no primeiro quadro, antes de o satélite chegar lá.
 */
export function deriveElements(state: OrbitState, mu: number): OrbitElements {
  const r = Math.hypot(state.position.x, state.position.y);
  const v = Math.hypot(state.velocity.x, state.velocity.y);

  // Energia específica: negativa é órbita fechada, positiva escapa.
  const specificEnergy = (v * v) / 2 - mu / r;

  // Momento angular específico (escalar, porque o movimento é plano).
  const h = state.position.x * state.velocity.y - state.position.y * state.velocity.x;

  const eccentricity = Math.sqrt(
    Math.max(0, 1 + (2 * specificEnergy * h * h) / (mu * mu)),
  );

  const escaping = specificEnergy >= 0;

  // Para trajetória aberta o semieixo maior é negativo — e continua válido para
  // o periapsis, que existe mesmo quando a órbita não fecha.
  const semiMajorAxis = -mu / (2 * specificEnergy);

  const periapsis = semiMajorAxis * (1 - eccentricity) - BODY_RADIUS;

  // Apoapsis e período só existem em órbita fechada.
  const apoapsis = escaping
    ? Infinity
    : semiMajorAxis * (1 + eccentricity) - BODY_RADIUS;

  const period = escaping
    ? Infinity
    : (2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / mu)) / 60;

  return {
    apoapsis,
    periapsis,
    eccentricity,
    period,
    specificEnergy,
    altitude: r - BODY_RADIUS,
    speed: v,
    escaping,
  };
}

/**
 * Simulador com estado.
 *
 * A classe existe para dar ao componente React um objeto estável entre
 * quadros — o `step` puro acima continua sendo a física, e é ele que os testes
 * exercitam.
 */
export class OrbitSimulator {
  private state: OrbitState;
  private mu: number;
  private readonly maxTrail: number;

  /** Trajetória percorrida, para desenhar o rastro. */
  readonly trail: Vec2[] = [];

  constructor(
    private params: OrbitParams,
    maxTrail = 4000,
  ) {
    this.mu = gravitationalParameter(params.centralMass);
    this.state = initialState(params);
    this.maxTrail = maxTrail;
    this.trail.push({ ...this.state.position });
  }

  /** Reinicia com novos parâmetros, descartando o rastro anterior. */
  reset(params: OrbitParams): void {
    this.params = params;
    this.mu = gravitationalParameter(params.centralMass);
    this.state = initialState(params);
    this.trail.length = 0;
    this.trail.push({ ...this.state.position });
  }

  /** Avança `substeps` passos de `dt` segundos cada. */
  advance(dt: number, substeps = 1): void {
    for (let i = 0; i < substeps; i += 1) {
      this.state = step(this.state, dt, this.mu);

      if (this.state.impacted) break;
    }

    this.trail.push({ ...this.state.position });

    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }
  }

  get current(): OrbitState {
    return this.state;
  }

  get elements(): OrbitElements {
    return deriveElements(this.state, this.mu);
  }

  get gravitationalParameter(): number {
    return this.mu;
  }

  get initialRadius(): number {
    return BODY_RADIUS + this.params.altitude;
  }
}
