import type { SyntheticOptions } from "../simulation/synthetic";

/**
 * Os cinco casos que este módulo ensina.
 *
 * Nenhum deles é dado real, e isso está dito na interface em vez de escondido.
 * As designações começam com `SIN-` justamente para nunca serem confundidas com
 * um identificador de catálogo: inventar um `TIC` plausível seria fabricar
 * procedência, que é o erro mais caro possível numa plataforma cujo propósito é
 * ser confiável.
 *
 * Quando os alvos reais chegarem, esta lista vira uma consulta a `datasets` e o
 * resto do módulo não muda — a curva entra pela mesma porta.
 *
 * A escolha dos cinco não é arbitrária. Um conjunto só com trânsitos óbvios
 * ensina a apertar um botão; este ensina que o método erra, e como.
 */
export interface TargetCase {
  key: string;
  designation: string;
  label: string;
  /** O que a pessoa vê antes de analisar. */
  brief: string;
  /** O que o caso ensina — revelado junto do resultado. */
  lesson: string;
  options: Partial<SyntheticOptions>;
}

export const TARGETS: TargetCase[] = [
  {
    key: "transito-claro",
    designation: "SIN-1",
    label: "Trânsito evidente",
    brief:
      "Queda periódica funda, muito acima do ruído. O caso em que o método funciona sem esforço.",
    lesson:
      "Com profundidade dessa ordem e relação sinal/ruído alta, o periodograma tem um pico único e inconfundível. É o caso de referência — e é o mais raro dos cinco no céu real.",
    options: {
      period: 3.2,
      depth: 0.02,
      durationHours: 2.5,
      epoch: 1.1,
      noise: 0.0008,
      variabilityAmplitude: 0.002,
      variabilityPeriod: 9,
      seed: 1101,
    },
  },
  {
    key: "transito-raso",
    designation: "SIN-2",
    label: "Trânsito raso",
    brief:
      "Há um sinal, e ele é pequeno. Perto do limite em que a curva deixa de responder sozinha.",
    lesson:
      "A profundidade caiu para um quarto do caso anterior e o ruído continuou o mesmo. O trânsito ainda é recuperável, mas agora depende de achatar bem: com a janela errada, o sinal some junto com a variabilidade. É aqui que a janela do detrend deixa de ser detalhe.",
    options: {
      period: 4.6,
      depth: 0.0035,
      durationHours: 3,
      epoch: 0.9,
      noise: 0.0011,
      variabilityAmplitude: 0.004,
      variabilityPeriod: 7,
      seed: 2202,
    },
  },
  {
    key: "binaria",
    designation: "SIN-3",
    label: "Binária eclipsante",
    brief:
      "Queda periódica profunda, com um segundo mergulho mais raso entre uma e outra.",
    lesson:
      "Não é planeta — e é o alvo com o pico mais alto dos cinco, várias vezes maior que o do trânsito verdadeiro. Guarde isso: o sinal mais forte não é o achado mais interessante. Profundidade dessa ordem exigiria um companheiro do tamanho de uma estrela, e o segundo mergulho, meio período depois, é a companheira passando por trás. Dobre a curva e olhe a fase 0,5: é ali que o falso positivo se entrega. O BLS está certo sobre o período e errado sobre o que ele significa — e essa distinção é a coisa mais importante deste módulo.",
    options: {
      period: 2.1,
      depth: 0.12,
      secondaryDepth: 0.03,
      durationHours: 3.2,
      epoch: 0.6,
      noise: 0.0009,
      variabilityAmplitude: 0.002,
      variabilityPeriod: 11,
      seed: 3303,
    },
  },
  {
    key: "variavel",
    designation: "SIN-4",
    label: "Estrela variável",
    brief:
      "Brilho que sobe e desce continuamente, sem nenhuma queda brusca.",
    lesson:
      "Periodicidade sem trânsito, e o caso mais instrutivo dos cinco. Com a janela padrão, o achatamento reduz a ondulação mas não a elimina — a variação é lenta demais para a mediana móvel apagá-la —, e o que sobra ainda produz um pico maior que o do trânsito raso. Ou seja: altura de pico e relação sinal/ruído, sozinhas, colocariam esta estrela à frente de um planeta verdadeiro. O que separa as duas é a forma da curva dobrada: aqui a variação é suave e ocupa o ciclo inteiro; um trânsito é uma queda curta de fundo plano. Encurte a janela de achatamento e veja o pico ceder — é a demonstração de que o parâmetro do método muda a conclusão.",
    options: {
      period: null,
      noise: 0.0009,
      variabilityAmplitude: 0.02,
      variabilityPeriod: 1.6,
      seed: 4404,
    },
  },
  {
    key: "silencio",
    designation: "SIN-5",
    label: "Nada",
    brief: "Ruído fotométrico e mais nada. Nenhum sinal foi injetado nesta curva.",
    lesson:
      "O BLS devolve um período mesmo aqui — ele é uma busca, não um juiz, e sempre encontra a melhor caixa disponível. Um método que nunca devolve “nada” não serve para descobrir coisa alguma.\n\nMas cuidado com a conclusão fácil. Esta curva é sintética e o vazio dela é real, porque fomos nós que não injetamos nada. **No céu não existe curva assim.** A série observacional equivalente deste módulo — uma estrela sem nenhum objeto de interesse catalogado — devolve pico maior que o de uma super-Terra confirmada. Use este caso para entender o que o método faz sem sinal, e não como régua para julgar dado real.",
    options: {
      period: null,
      noise: 0.0012,
      variabilityAmplitude: 0.001,
      variabilityPeriod: 12,
      seed: 5505,
    },
  },
];

/** Extensão e cadência comuns a todos os alvos, para que sejam comparáveis. */
export const OBSERVATION_WINDOW = {
  baselineDays: 27,
  cadenceMinutes: 10,
} as const;

export const TARGET_BY_KEY: Record<string, TargetCase> = Object.fromEntries(
  TARGETS.map((target) => [target.key, target]),
);
