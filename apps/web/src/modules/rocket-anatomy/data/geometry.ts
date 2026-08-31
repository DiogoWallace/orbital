/**
 * Onde cada sistema é desenhado.
 *
 * Isto é deliberadamente **separado do `spec`**. O `spec` no banco carrega o
 * que é editorial — rótulo, pergunta, explicação — e é ligado a este arquivo
 * pela mesma `key`. Coordenada de traçado é assunto do componente: assim a
 * redação muda sem tocar em código, e o desenho muda sem migration nem seed.
 *
 * Uma `key` presente aqui e ausente do `spec` simplesmente não é desenhada, e
 * vice-versa. É a mesma tolerância que o registry tem com módulo sem
 * componente: conteúdo e implementação avançam em ritmos diferentes, e o
 * descompasso é estado normal, não erro.
 */

/** O desenho vive neste sistema de coordenadas; o SVG escala a partir dele. */
export const VIEWBOX = { width: 240, height: 320 } as const;

export interface PartShape {
  key: string;
  /** Traçado que recebe foco, clique e destaque. */
  d: string;
  /**
   * Peças que existem como linha, não como área — canais de refrigeração,
   * hastes de atuador. Elas precisam de um alvo de clique mais largo que o
   * traço visível, e de nenhum preenchimento.
   */
  stroke?: boolean;
  /** Traçado decorativo, sem interação: rotores, aletas, reforços. */
  detail?: string;
  /** Ponta da linha de chamada do rótulo, quando a peça está em evidência. */
  labelAt: { x: number; y: number; side: "left" | "right" };
}

/**
 * A casca externa e o eixo — contexto visual, sem interação própria.
 *
 * O fuselado precisa existir para as peças internas fazerem sentido, mas ele
 * não é um sistema que a pessoa selecione: quem responde por ele é a
 * `structure`.
 */
export const CHROME = {
  skin: "M90 58 V232 M150 58 V232",
  axis: "M120 8 V318",
} as const;

export const PARTS: PartShape[] = [
  {
    key: "nose-cone",
    d: "M120 8 C134 26 150 44 150 58 L90 58 C90 44 106 26 120 8 Z",
    labelAt: { x: 150, y: 38, side: "right" },
  },
  {
    key: "payload",
    d: "M103 64 H137 V88 H103 Z",
    detail: "M110 70 H130 M110 76 H130 M110 82 H130",
    labelAt: { x: 137, y: 76, side: "right" },
  },
  {
    key: "oxidizer-tank",
    d: "M92 100 C92 92 148 92 148 100 V142 C148 150 92 150 92 142 Z",
    labelAt: { x: 92, y: 121, side: "left" },
  },
  {
    key: "pressurization",
    d: "M99 162 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M127 162 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0",
    labelAt: { x: 141, y: 162, side: "right" },
  },
  {
    key: "fuel-tank",
    d: "M92 180 C92 172 148 172 148 180 V220 C148 228 92 228 92 220 Z",
    labelAt: { x: 92, y: 200, side: "left" },
  },
  {
    key: "structure",
    d: "M90 232 H150 V248 H90 Z",
    detail: "M98 232 V248 M112 232 V248 M128 232 V248 M142 232 V248",
    labelAt: { x: 90, y: 240, side: "left" },
  },
  {
    key: "avionics",
    d: "M96 252 H144 V264 H96 Z",
    detail: "M102 256 H108 M114 256 H120 M126 256 H132 M138 256 H142",
    labelAt: { x: 144, y: 258, side: "right" },
  },
  {
    key: "turbopump",
    d: "M100 268 H140 V286 H100 Z",
    detail:
      "M106 277 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M124 277 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0",
    labelAt: { x: 140, y: 277, side: "right" },
  },
  {
    key: "gimbal",
    d: "M88 286 L100 296 M152 286 L140 296",
    stroke: true,
    labelAt: { x: 88, y: 291, side: "left" },
  },
  {
    key: "regenerative-cooling",
    d: "M101 289 L109 303 M139 289 L131 303",
    stroke: true,
    labelAt: { x: 101, y: 296, side: "left" },
  },
  {
    key: "combustion-chamber",
    d: "M104 290 H136 L128 304 H112 Z",
    labelAt: { x: 136, y: 297, side: "right" },
  },
  {
    key: "nozzle",
    d: "M112 304 H128 L142 318 H98 Z",
    labelAt: { x: 142, y: 312, side: "right" },
  },
];

/** Índice por chave — o componente cruza `spec.hotspots` com isto. */
export const SHAPE_BY_KEY: Record<string, PartShape> = Object.fromEntries(
  PARTS.map((part) => [part.key, part]),
);
