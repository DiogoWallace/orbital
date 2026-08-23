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
