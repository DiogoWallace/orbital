/**
 * Ascensão de um estágio — TypeScript puro, sem React (ADR 0007).
 *
 * Unidades SI por dentro: metro, quilograma, segundo, pascal, newton. A
 * conversão para as unidades de leitura acontece só em `deriveReadout`, na
 * saída — misturar unidades no meio da integração é a origem clássica de erro
 * silencioso em código de voo.
 *
 * O modelo é de livro-texto, e é honesto sobre o que não faz: voo puramente
 * vertical, sem manobra de inclinação, sem separação de estágios, sem
 * variação de arrasto com o número de Mach, atmosfera exponencial isotérmica.
 * Serve para ver *por que* pressão de câmara, razão de expansão e massa de
 * propelente mudam o resultado — e não para dimensionar um lançador.
 *
 * As constantes de propelente são valores típicos de uma combinação
 * querosene/oxigênio líquido, não de nenhum veículo específico.
 */

/** Versão do modelo físico, gravada com cada execução salva. */
export const MODEL_VERSION = "1.0.0";

/** Aceleração padrão, usada só na definição de impulso específico. */
const G0 = 9.80665;

/** Parâmetro gravitacional da Terra (m³/s²). */
const MU = 3.986004418e14;

/** Raio da Terra (m) — define a superfície e, portanto, a altitude. */
const EARTH_RADIUS = 6.371e6;

/** Pressão e densidade ao nível do mar. */
const SEA_LEVEL_PRESSURE = 101325;
const SEA_LEVEL_DENSITY = 1.225;

/** Altura de escala da atmosfera exponencial (m). */
const SCALE_HEIGHT = 8500;

/** Razão de calores específicos dos gases de exaustão. */
const GAMMA = 1.2;

/** Constante universal dos gases (J/mol·K) e massa molar da exaustão (kg/mol). */
const R_UNIVERSAL = 8.3145;
const EXHAUST_MOLAR_MASS = 0.022;

/** Constante específica do gás de exaustão (J/kg·K). */
const R_SPECIFIC = R_UNIVERSAL / EXHAUST_MOLAR_MASS;

/** Temperatura de chama adiabática típica da combinação (K). */
const CHAMBER_TEMPERATURE = 3500;

/** Coeficiente de arrasto e área frontal (m²) do veículo de referência. */
const DRAG_COEFFICIENT = 0.3;
const FRONTAL_AREA = Math.PI * 1.85 ** 2;

export interface AscentParams {
  /** Área da garganta da tubeira, em cm². */
  throatArea: number;
  /** Pressão na câmara de combustão, em bar. */
  chamberPressure: number;
  /** Razão de expansão da tubeira: área de saída sobre área da garganta. */
  expansionRatio: number;
  /** Massa de propelente embarcada, em toneladas. */
  propellantMass: number;
  /** Massa seca — estrutura, motor e carga útil —, em toneladas. */
  dryMass: number;
  /** Fração do empuxo máximo, em porcento. */
  throttle: number;
}

export interface AscentState {
  /** Tempo simulado desde a decolagem, em segundos. */
  time: number;
  /** Altitude acima do nível do mar, em metros. */
  altitude: number;
  /** Velocidade vertical, em m/s. Negativa é queda. */
  velocity: number;
  /** Propelente restante, em kg. */
  propellant: number;
  /** Maior pressão dinâmica já atingida no voo, em Pa. */
  maxDynamicPressure: number;
  /** Instante em que o propelente acabou, em segundos. `null` enquanto queima. */
  burnoutTime: number | null;
  /** `true` quando o veículo voltou ao solo. */
  landed: boolean;
}

/**
 * O que a tubeira faz, dado o seu formato.
 *
 * Tudo aqui é constante ao longo do voo: depende só dos parâmetros, nunca do
 * estado. Calcular uma vez e reusar mantém a integração barata e, mais
 * importante, mantém o resultado idêntico entre execuções.
 */
export interface EngineModel {
  /** Número de Mach na saída da tubeira. */
  exitMach: number;
  /** Velocidade de exaustão, em m/s. */
  exhaustVelocity: number;
  /** Temperatura do gás na saída, em K. */
  exitTemperature: number;
  /** Pressão do gás na saída, em Pa. */
  exitPressure: number;
  /** Vazão mássica, em kg/s. */
  massFlow: number;
  /** Área de saída, em m². */
  exitArea: number;
}

/**
 * Número de Mach na saída a partir da razão de expansão.
 *
 * A relação área–Mach não se inverte em forma fechada, então é resolvida por
 * bisseção. Ela é monotônica para escoamento supersônico, o que torna a
 * bisseção segura e determinística: mesmo número de iterações, mesmo
 * resultado, em qualquer máquina.
 */
export function exitMachFor(expansionRatio: number): number {
  const areaRatio = (mach: number): number =>
    (1 / mach) *
    ((2 / (GAMMA + 1)) * (1 + ((GAMMA - 1) / 2) * mach ** 2)) **
      ((GAMMA + 1) / (2 * (GAMMA - 1)));

  let baixo = 1.0001;
  let alto = 12;

  // 60 passos levam o intervalo a ~1e-17: muito além da precisão útil, e ainda
  // assim barato. Contagem fixa em vez de tolerância mantém o determinismo.
  for (let i = 0; i < 60; i += 1) {
    const meio = (baixo + alto) / 2;

    if (areaRatio(meio) < expansionRatio) baixo = meio;
    else alto = meio;
  }

  return (baixo + alto) / 2;
}

/** Velocidade característica do propelente (m/s) — propriedade da combustão. */
export function characteristicVelocity(): number {
  return (
    Math.sqrt((R_SPECIFIC * CHAMBER_TEMPERATURE) / GAMMA) *
    ((GAMMA + 1) / 2) ** ((GAMMA + 1) / (2 * (GAMMA - 1)))
  );
}

export function buildEngine(params: AscentParams): EngineModel {
  const throatArea = params.throatArea / 1e4;
  const exitArea = throatArea * params.expansionRatio;

  // Acelerar menos é, na prática, baixar a pressão da câmara. Modelar assim, e
  // não multiplicando o empuxo no fim, é o que faz a perda de eficiência ao
  // acelerar menos aparecer sozinha: a vazão cai junto com a pressão de saída,
  // mas a pressão ambiente continua a mesma.
  const chamberPressure = params.chamberPressure * 1e5 * (params.throttle / 100);

  const exitMach = exitMachFor(params.expansionRatio);
  const temperatureRatio = 1 + ((GAMMA - 1) / 2) * exitMach ** 2;

  const exitTemperature = CHAMBER_TEMPERATURE / temperatureRatio;
  const exitPressure = chamberPressure / temperatureRatio ** (GAMMA / (GAMMA - 1));
  const exhaustVelocity = exitMach * Math.sqrt(GAMMA * R_SPECIFIC * exitTemperature);

  return {
    exitMach,
    exhaustVelocity,
    exitTemperature,
    exitPressure,
    exitArea,
    massFlow: (chamberPressure * throatArea) / characteristicVelocity(),
  };
}

/** Pressão atmosférica (Pa) a uma altitude, no modelo exponencial. */
export function ambientPressure(altitude: number): number {
  return SEA_LEVEL_PRESSURE * Math.exp(-Math.max(altitude, 0) / SCALE_HEIGHT);
}

/** Densidade do ar (kg/m³) a uma altitude. */
export function airDensity(altitude: number): number {
  return SEA_LEVEL_DENSITY * Math.exp(-Math.max(altitude, 0) / SCALE_HEIGHT);
}

/**
 * Empuxo (N) a uma dada pressão ambiente.
 *
 * A parcela de pressão é o que faz o mesmo motor entregar empuxos diferentes
 * ao nível do mar e no vácuo. Com razão de expansão grande demais para a
 * altitude, `exitPressure - ambient` fica negativo e o empuxo cai — é o
 * fenômeno real da sobre-expansão. O piso em zero evita que o modelo
 * simplificado chegue ao absurdo de empurrar para trás; na prática o que
 * aconteceria antes disso é a separação do escoamento dentro do sino, que
 * este modelo não descreve.
 */
export function thrustAt(engine: EngineModel, ambient: number): number {
  const bruto =
    engine.massFlow * engine.exhaustVelocity + (engine.exitPressure - ambient) * engine.exitArea;

  return Math.max(bruto, 0);
}

export function initialState(params: AscentParams): AscentState {
  return {
    time: 0,
    altitude: 0,
    velocity: 0,
    propellant: params.propellantMass * 1000,
    maxDynamicPressure: 0,
    burnoutTime: null,
    landed: false,
  };
}

/**
 * Um passo de integração.
 *
 * Euler semi-implícito: a velocidade é atualizada antes da posição. Para um
 * problema com aceleração dependente de posição e massa, ele é estável em
 * passos que um Euler explícito já faria divergir, e custa o mesmo.
 */
export function step(
  state: AscentState,
  dt: number,
  engine: EngineModel,
  params: AscentParams,
): AscentState {
  if (state.landed) return state;

  const ambient = ambientPressure(state.altitude);
  const density = airDensity(state.altitude);
  const gravity = MU / (EARTH_RADIUS + Math.max(state.altitude, 0)) ** 2;

  const queimando = state.propellant > 0;
  const massFlow = queimando ? engine.massFlow : 0;
  const thrust = queimando ? thrustAt(engine, ambient) : 0;

  const mass = params.dryMass * 1000 + state.propellant;

  const dynamicPressure = 0.5 * density * state.velocity ** 2;
  // O arrasto se opõe ao movimento, então acompanha o sinal da velocidade —
  // na descida ele empurra para cima.
  const drag = Math.sign(state.velocity) * dynamicPressure * DRAG_COEFFICIENT * FRONTAL_AREA;

  const acceleration = (thrust - drag) / mass - gravity;

  const velocity = state.velocity + acceleration * dt;
  const altitude = state.altitude + velocity * dt;
  const propellant = Math.max(state.propellant - massFlow * dt, 0);

  const burnoutTime =
    state.burnoutTime ?? (state.propellant > 0 && propellant === 0 ? state.time + dt : null);

  // Voltar ao solo encerra o voo. Sem isto a integração continuaria para
  // altitudes negativas, onde a atmosfera exponencial explode.
  if (altitude <= 0 && state.time > 0) {
    return {
      ...state,
      time: state.time + dt,
      altitude: 0,
      velocity: 0,
      propellant,
      burnoutTime,
      landed: true,
    };
  }

  return {
    time: state.time + dt,
    altitude,
    velocity,
    propellant,
    maxDynamicPressure: Math.max(state.maxDynamicPressure, dynamicPressure),
    burnoutTime,
    landed: false,
  };
}

/**
 * Alias de tipo, e não `interface`, de propósito: os componentes do núcleo
 * recebem as leituras como `Record<string, number>`, e só um alias ganha a
 * assinatura de índice implícita que torna isso válido. Uma `interface` aqui
 * compila neste arquivo e quebra na fronteira com o `ReadoutGrid`.
 */
export type AscentReadout = {
  /** Altitude, em km. */
  altitude: number;
  /** Velocidade, em km/s. */
  velocity: number;
  /** Aceleração sentida a bordo, em múltiplos de g. */
  acceleration: number;
  /** Massa total, em toneladas. */
  mass: number;
  /** Empuxo, em kN. */
  thrust: number;
  /** Pressão dinâmica, em kPa. */
  dynamicPressure: number;
  /** Impulso específico nas condições do instante, em segundos. */
  isp: number;
  /** Temperatura do gás na saída da tubeira, em K. */
  exitTemperature: number;
};

export function deriveReadout(
  state: AscentState,
  engine: EngineModel,
  params: AscentParams,
): AscentReadout {
  const ambient = ambientPressure(state.altitude);
  const density = airDensity(state.altitude);

  const queimando = state.propellant > 0 && !state.landed;
  const thrust = queimando ? thrustAt(engine, ambient) : 0;
  const mass = params.dryMass * 1000 + state.propellant;

  const dynamicPressure = 0.5 * density * state.velocity ** 2;
  const drag = Math.sign(state.velocity) * dynamicPressure * DRAG_COEFFICIENT * FRONTAL_AREA;

  return {
    altitude: state.altitude / 1000,
    velocity: state.velocity / 1000,
    // O acelerômetro a bordo mede força própria: empuxo e arrasto, não a
    // gravidade. Em queda livre ele marca zero, e é isso que a tripulação
    // sente — por isso a gravidade não entra nesta conta.
    acceleration: (thrust - drag) / mass / G0,
    mass: mass / 1000,
    thrust: thrust / 1000,
    dynamicPressure: dynamicPressure / 1000,
    isp: queimando ? thrust / (engine.massFlow * G0) : 0,
    exitTemperature: engine.exitTemperature,
  };
}

/**
 * Casca com estado, para o componente não guardar a integração em `useState`.
 *
 * Mesma forma do `OrbitSimulator`: o React observa um contador e lê daqui.
 */
export class AscentSimulator {
  private state: AscentState;

  private readonly engine: EngineModel;

  constructor(private readonly params: AscentParams) {
    this.engine = buildEngine(params);
    this.state = initialState(params);
  }

  advance(dt: number, substeps = 1): void {
    for (let i = 0; i < substeps; i += 1) {
      this.state = step(this.state, dt, this.engine, this.params);
    }
  }

  get current(): AscentState {
    return this.state;
  }

  get motor(): EngineModel {
    return this.engine;
  }

  get readout(): AscentReadout {
    return deriveReadout(this.state, this.engine, this.params);
  }
}
