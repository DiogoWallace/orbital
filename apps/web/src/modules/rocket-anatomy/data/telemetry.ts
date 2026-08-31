/**
 * Qual leitura pertence a qual sistema.
 *
 * É o que costura a anatomia à simulação: com o voo em andamento, o painel do
 * sistema selecionado mostra os números que dizem respeito **àquela peça**, e
 * não a grade inteira de mostradores.
 *
 * A diferença é de leitura, não de dado. Ver a pressão dinâmica ao lado do
 * texto sobre a estrutura responde "quando é que o esforço é máximo?" na hora
 * em que a pergunta aparece; a mesma linha perdida entre oito mostradores
 * responde a pergunta nenhuma.
 *
 * As chaves são as do `outputs` no `spec`. Sistema sem leitura associada
 * simplesmente não mostra nada — nem toda peça tem um número que a descreva, e
 * inventar um seria pior que a ausência.
 */
export const TELEMETRY_BY_PART: Record<string, string[]> = {
  "nose-cone": ["dynamicPressure", "velocity"],
  payload: ["mass", "altitude"],
  "oxidizer-tank": ["mass"],
  "fuel-tank": ["mass"],
  turbopump: ["thrust"],
  "combustion-chamber": ["thrust", "isp"],
  "regenerative-cooling": ["exitTemperature"],
  nozzle: ["isp", "exitTemperature"],
  avionics: ["altitude", "velocity"],
  structure: ["dynamicPressure", "acceleration"],
};
