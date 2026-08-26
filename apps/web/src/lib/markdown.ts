import type { ReactNode } from "react";

/**
 * Utilidades de Markdown que o sumário lateral do post precisa.
 *
 * O `react-markdown` não põe `id` nos títulos que renderiza, e sem `id` não há
 * âncora para onde apontar. Existe plugin de prateleira para isso
 * (`rehype-slug`), e ele foi descartado: seriam mais dependências e um segundo
 * algoritmo de slug no projeto, quando o que falta é uma função de dez linhas
 * usada dos dois lados — pelo sumário, que lê o Markdown cru, e pelo
 * renderizador, que vê o título já convertido. O que importa é que os dois
 * cheguem à mesma string, e é por isso que ela mora aqui, sozinha.
 */

/** `Da medida para a imagem` → `da-medida-para-a-imagem`. */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    // Remove os diacríticos que a decomposição separou: sem isto "física"
    // viraria "fi-sica", com o acento sobrando como caractere próprio.
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ItemDeSumario {
  id: string;
  titulo: string;
}

/**
 * Os títulos de segundo nível do corpo, na ordem em que aparecem.
 *
 * Só `##`. Um sumário que desce até `###` numa nota de seis minutos lista mais
 * linhas do que o texto tem seções, e deixa de ser um mapa.
 *
 * Blocos de código são pulados: `## algo` dentro de uma cerca é conteúdo, não
 * título, e listá-lo geraria uma âncora que não existe na página.
 */
export function extrairSumario(body: string): ItemDeSumario[] {
  const itens: ItemDeSumario[] = [];
  let dentroDeCerca = false;

  for (const linha of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(linha)) {
      dentroDeCerca = !dentroDeCerca;
      continue;
    }

    if (dentroDeCerca) continue;

    const titulo = /^##\s+(.+?)\s*#*\s*$/.exec(linha)?.[1];

    if (titulo) {
      // A ênfase em Markdown não sobrevive ao texto do sumário — `**assim**`
      // seria lido como parte do título, e o `id` gerado não bateria com o do
      // título renderizado, onde os asteriscos já viraram marcação.
      const limpo = titulo.replace(/[*_`]/g, "").trim();

      itens.push({ id: slugificar(limpo), titulo: limpo });
    }
  }

  return itens;
}

/**
 * O texto puro de um nó do React, para gerar o `id` do título renderizado.
 *
 * O `react-markdown` entrega os filhos já convertidos — `<em>`, `<code>` e
 * companhia viram elementos —, então achatar recursivamente é o que devolve a
 * mesma string que `extrairSumario` viu no Markdown cru.
 */
export function textoDe(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((filho) => textoDe(filho)).join("");

  if (typeof node === "object" && "props" in node) {
    return textoDe((node.props as { children?: ReactNode }).children);
  }

  return "";
}
