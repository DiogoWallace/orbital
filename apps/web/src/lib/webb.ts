import type { StaticImageData } from "next/image";
import campoProfundo from "../../public/webb/campo-profundo.webp";
import carina from "../../public/webb/carina-cosmic-cliffs.webp";
import netuno from "../../public/webb/netuno.webp";
import pilares from "../../public/webb/pilares-da-criacao.webp";
import quinteto from "../../public/webb/quinteto-de-stephan.webp";
import tarantula from "../../public/webb/nebulosa-da-tarantula.webp";

/**
 * As imagens do James Webb que a landing usa.
 *
 * Conteúdo curado e versionado no repositório, e não linha no banco: isto é a
 * vitrine, não um módulo científico. Módulo é o que o núcleo padroniza pelo
 * contrato (ADR 0005); uma landing muda por decisão editorial, não por
 * cadastro.
 *
 * Import estático em vez de caminho em string: o Next passa a conhecer largura,
 * altura e um placeholder borrado de cada arquivo em tempo de build. Isso evita
 * o pulo de layout enquanto a imagem carrega — numa página cheia de fotos
 * pesadas, é a diferença entre uma leitura estável e um texto que foge do olho.
 *
 * ------------------------------------------------------------------------
 * LICENÇA: todas as imagens são da ESA/Webb, sob Creative Commons Attribution
 * 4.0 International. O crédito precisa aparecer de forma legível, sem
 * abreviação, e com link ativo — por isso `credito` é campo obrigatório aqui e
 * é renderizado junto de cada imagem, nunca só no rodapé.
 * https://esawebb.org/copyright/
 * ------------------------------------------------------------------------
 *
 * Os dados de cada objeto vêm da página da própria ESA, não de memória.
 */
export interface WebbImage {
  /** Identificador da ESA, que também é a chave da página de origem. */
  id: string;
  titulo: string;
  imagem: StaticImageData;
  /** Descrição para leitor de tela: o que se vê, não o nome do arquivo. */
  alt: string;
  /** Uma frase sobre o que a imagem mostra e por que ela importa. */
  legenda: string;
  /** Lidos como um painel de instrumento: rótulo curto, valor curto. */
  dados: Array<{ rotulo: string; valor: string }>;
  credito: string;
  fonte: string;
}

const fonte = (id: string) => `https://esawebb.org/images/${id}/`;

/** A imagem de abertura. Separada porque é a única com `priority` no carregamento. */
export const heroWebb: WebbImage = {
  id: "weic2205a",
  titulo: "Cosmic Cliffs, na Nebulosa de Carina",
  imagem: carina,
  alt: "Paisagem de nuvens de poeira alaranjadas com picos irregulares, sob um campo azul-escuro salpicado de estrelas brilhantes.",
  legenda:
    "O que parece uma cordilheira ao anoitecer é a borda de uma cavidade gasosa esculpida pela radiação de estrelas jovens e massivas. Os picos mais altos têm cerca de sete anos-luz.",
  dados: [
    { rotulo: "Objeto", valor: "NGC 3324" },
    { rotulo: "Constelação", valor: "Carina" },
    { rotulo: "Distância", valor: "7 600 anos-luz" },
    { rotulo: "Instrumento", valor: "NIRCam" },
    { rotulo: "Divulgação", valor: "12/07/2022" },
  ],
  credito: "NASA, ESA, CSA, and STScI",
  fonte: fonte("weic2205a"),
};

export const galeriaWebb: WebbImage[] = [
  {
    id: "weic2209a",
    titulo: "O primeiro campo profundo",
    imagem: campoProfundo,
    alt: "Fundo preto coberto por centenas de galáxias de cores e formas variadas; várias aparecem esticadas em arcos ao redor do centro.",
    legenda:
      "Os arcos não são galáxias deformadas: é a massa do aglomerado em primeiro plano curvando o espaço e funcionando como lente sobre o que está atrás. A exposição levou 12,5 horas.",
    dados: [
      { rotulo: "Objeto", valor: "SMACS 0723" },
      { rotulo: "Constelação", valor: "Volans" },
      { rotulo: "Instrumento", valor: "NIRCam" },
      { rotulo: "Divulgação", valor: "12/07/2022" },
    ],
    credito: "NASA, ESA, CSA, and STScI",
    fonte: fonte("weic2209a"),
  },
  {
    id: "weic2216b",
    titulo: "Pilares da Criação",
    imagem: pilares,
    alt: "Três colunas de gás e poeira marrom-avermelhadas erguendo-se contra um fundo azulado repleto de estrelas.",
    legenda:
      "As colunas são gás denso o bastante para resistir à erosão da radiação vizinha. As manchas vermelhas nas pontas são estrelas em formação, com poucas centenas de milhares de anos.",
    dados: [
      { rotulo: "Objeto", valor: "Messier 16" },
      { rotulo: "Constelação", valor: "Serpens Cauda" },
      { rotulo: "Distância", valor: "6 500 anos-luz" },
      { rotulo: "Instrumento", valor: "NIRCam" },
      { rotulo: "Divulgação", valor: "19/10/2022" },
    ],
    credito: "NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI)",
    fonte: fonte("weic2216b"),
  },
  {
    id: "weic2208a",
    titulo: "Quinteto de Stephan",
    imagem: quinteto,
    alt: "Cinco galáxias agrupadas; duas delas aparecem entrelaçadas por caudas de gás e estrelas.",
    legenda:
      "São cinco galáxias na imagem, mas só quatro estão juntas de fato: NGC 7320 fica a 40 milhões de anos-luz, e as outras a cerca de 290 milhões. A proximidade é de perspectiva.",
    dados: [
      { rotulo: "Objeto", valor: "HCG 92" },
      { rotulo: "Constelação", valor: "Pegasus" },
      { rotulo: "Distância", valor: "290 milhões de anos-luz" },
      { rotulo: "Instrumento", valor: "NIRCam + MIRI" },
      { rotulo: "Divulgação", valor: "12/07/2022" },
    ],
    credito: "NASA, ESA, CSA, and STScI",
    fonte: fonte("weic2208a"),
  },
  {
    id: "weic2212a",
    titulo: "Nebulosa da Tarântula",
    imagem: tarantula,
    alt: "Cavidade de gás azulado cercada por filamentos de poeira, com um aglomerado de estrelas brilhantes no centro.",
    legenda:
      "A região de formação estelar mais ativa do grupo de galáxias vizinho à Via Láctea. O aglomerado central escavou a cavidade com vento estelar; a poeira ao redor resiste porque é densa demais.",
    dados: [
      { rotulo: "Objeto", valor: "30 Doradus" },
      { rotulo: "Constelação", valor: "Dorado" },
      { rotulo: "Instrumento", valor: "NIRCam" },
      { rotulo: "Divulgação", valor: "06/09/2022" },
    ],
    credito: "NASA, ESA, CSA, and STScI",
    fonte: fonte("weic2212a"),
  },
  {
    id: "weic2214a",
    titulo: "Netuno e seus anéis",
    imagem: netuno,
    alt: "Netuno em tons de branco acinzentado, cercado por anéis finos e brilhantes, sobre fundo preto.",
    legenda:
      "Em luz visível Netuno é azul; no infravermelho o metano da atmosfera absorve tanto que o planeta escurece — e as manchas claras são nuvens de gelo de metano em altitude. Os anéis não eram vistos com esta nitidez havia mais de trinta anos.",
    dados: [
      { rotulo: "Objeto", valor: "Netuno" },
      { rotulo: "Distância", valor: "~30 UA do Sol" },
      { rotulo: "Instrumento", valor: "NIRCam" },
      { rotulo: "Divulgação", valor: "21/09/2022" },
    ],
    credito: "NASA, ESA, CSA, and STScI",
    fonte: fonte("weic2214a"),
  },
];
