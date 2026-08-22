"use client";

import { formatNumber } from "@/lib/utils";
import type { OutputSpec } from "@/modules/types";

/**
 * Mostradores de saída.
 *
 * Também genérico: recebe as definições do `spec` e os valores calculados pelo
 * módulo. Valores não finitos viram "∞" ou "—" em vez de `NaN` — numa
 * trajetória de escape, período infinito é o resultado correto, não um erro.
 */
export function ReadoutGrid({
  outputs,
  values,
}: {
  outputs: OutputSpec[];
  values: Record<string, number>;
}) {
  if (outputs.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3 lg:grid-cols-5">
      {outputs.map((output) => {
        const value = values[output.key];

        return (
          <div key={output.key} className="bg-[var(--color-surface)] px-4 py-3">
            <dt className="text-[11px] tracking-wide text-[var(--color-ink-faint)] uppercase">
              {output.label}
            </dt>
            <dd className="tabular mt-1 text-lg text-[var(--color-ink)]">
              {renderValue(value, output.precision)}
              {output.unit ? (
                <span className="ml-1 text-xs text-[var(--color-ink-faint)]">
                  {output.unit}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function renderValue(value: number | undefined, precision: number): string {
  if (value === undefined) return "—";
  if (value === Infinity) return "∞";
  if (!Number.isFinite(value)) return "—";

  return formatNumber(value, precision);
}
