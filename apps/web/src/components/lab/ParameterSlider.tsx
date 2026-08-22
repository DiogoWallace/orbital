"use client";

import { formatNumber } from "@/lib/utils";
import type { ParameterSpec } from "@/modules/types";

/**
 * Controle de uma variável numérica.
 *
 * O valor é mostrado em fonte tabular ao lado do rótulo, não dentro de um
 * tooltip: em um instrumento, o número precisa estar legível o tempo todo,
 * inclusive enquanto a mão está no controle.
 */
export function ParameterSlider({
  parameter,
  value,
  onChange,
}: {
  parameter: ParameterSpec;
  value: number;
  onChange: (value: number) => void;
}) {
  const { key, label, unit, min = 0, max = 1, step = 0.01, description } = parameter;

  // Casas decimais derivadas do passo: um passo de 0,01 pede duas casas, um
  // passo de 100 não pede nenhuma.
  const precision = step >= 1 ? 0 : String(step).split(".")[1]?.length ?? 2;

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={`param-${key}`}
          className="text-xs font-medium text-[var(--color-ink-muted)]"
        >
          {label}
        </label>
        <output
          htmlFor={`param-${key}`}
          className="tabular text-sm text-[var(--color-ink)]"
        >
          {formatNumber(value, precision)}
          {unit ? (
            <span className="ml-1 text-[var(--color-ink-faint)]">{unit}</span>
          ) : null}
        </output>
      </div>

      <input
        id={`param-${key}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={description ? `param-${key}-hint` : undefined}
        className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--accent)]"
      />

      {description ? (
        <p
          id={`param-${key}-hint`}
          className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]"
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
