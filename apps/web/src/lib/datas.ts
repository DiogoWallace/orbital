/**
 * Formatação de data para leitura.
 *
 * Fuso fixo em UTC de propósito. A API grava e devolve tudo em UTC, e estas
 * páginas são renderizadas no servidor: sem fixar, a data exibida passaria a
 * depender do fuso da máquina que rodou o render — um post publicado às 22h
 * viraria "ontem" ou "hoje" conforme onde o container estivesse. Data de
 * publicação é um rótulo estável, não um relógio.
 */
const FORMATO_LONGO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const FORMATO_CURTO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const FORMATO_FEED = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `23 de agosto de 2026`. Devolve string vazia quando não há data. */
export function formatarDataLonga(iso: string | null | undefined): string {
  if (!iso) return "";

  return FORMATO_LONGO.format(new Date(iso));
}

/** `23/08/2026`. Devolve string vazia quando não há data. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "";

  return FORMATO_CURTO.format(new Date(iso));
}

/**
 * `23 ago` — a data como ela aparece na linha de metadados do feed.
 *
 * O ano só entra quando o item não é do ano corrente. Numa lista cronológica,
 * repetir "2026" em quinze linhas seguidas gasta espaço para não informar
 * nada; quando o ano muda, aí ele passa a ser a informação mais importante da
 * linha.
 *
 * Montado a partir das partes, e não da string pronta: o pt-BR formata este
 * conjunto de campos como "23 de ago. de 2026", e o que a linha precisa é da
 * forma curta. Pedir as partes ao `Intl` e juntá-las aqui mantém a abreviação
 * do mês vindo da biblioteca — que é a parte que muda por idioma — sem herdar
 * as preposições.
 */
export function formatarDataFeed(
  iso: string | null | undefined,
  agora: Date = new Date(),
): string {
  if (!iso) return "";

  const data = new Date(iso);
  const partes = FORMATO_FEED.formatToParts(data);

  const dia = partes.find((parte) => parte.type === "day")?.value ?? "";
  const mes = (partes.find((parte) => parte.type === "month")?.value ?? "").replace(".", "");
  const ano = partes.find((parte) => parte.type === "year")?.value ?? "";

  const mesmoAno = data.getUTCFullYear() === agora.getUTCFullYear();

  return mesmoAno ? `${dia} ${mes}` : `${dia} ${mes} ${ano}`;
}
