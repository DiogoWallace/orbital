import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes resolvendo conflitos do Tailwind (a última vence). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número para leitura de instrumento.
 *
 * Casas decimais fixas de propósito: um valor que alterna entre "1,5" e
 * "1,52" enquanto o slider se move faz a linha inteira tremer.
 */
export function formatNumber(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return "—";

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** Converte o acento vindo da API na variável CSS correspondente. */
export function accentVariable(accent: string | null | undefined): string {
  const known = ["cyan", "violet", "amber", "emerald", "rose"];
  const safe = accent && known.includes(accent) ? accent : "cyan";

  return `var(--color-accent-${safe})`;
}
