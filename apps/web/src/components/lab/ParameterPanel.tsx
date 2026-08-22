"use client";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ParameterSlider } from "./ParameterSlider";
import type { ModuleSpec, ParameterValues } from "@/modules/types";

/**
 * Painel de controle genérico.
 *
 * Este componente é o coração do que o núcleo oferece a qualquer módulo: dado
 * um `spec`, ele monta o painel inteiro — sliders, unidades, presets — sem
 * saber o que as variáveis significam. Um módulo de química reaproveita este
 * mesmo arquivo sem uma linha de mudança (ADR 0005).
 */
export function ParameterPanel({
  spec,
  values,
  onChange,
  onApplyPreset,
  onReset,
}: {
  spec: ModuleSpec;
  values: ParameterValues;
  onChange: (key: string, value: number | boolean | string) => void;
  onApplyPreset: (key: string) => void;
  onReset: () => void;
}) {
  if (spec.parameters.length === 0) return null;

  return (
    <Panel as="aside">
      <PanelHeader
        title="Parâmetros"
        description="Ajuste e observe o resultado no mesmo quadro."
        action={
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-[var(--color-ink-faint)] transition-colors hover:text-[var(--accent)]"
          >
            Restaurar
          </button>
        }
      />

      {spec.presets.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-line)] px-5 py-3">
          {spec.presets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onApplyPreset(preset.key)}
              className="rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="divide-y divide-[var(--color-line)] px-5 py-1">
        {spec.parameters.map((parameter) => {
          if (parameter.type !== "number") return null;

          return (
            <ParameterSlider
              key={parameter.key}
              parameter={parameter}
              value={Number(values[parameter.key] ?? parameter.default)}
              onChange={(value) => onChange(parameter.key, value)}
            />
          );
        })}
      </div>
    </Panel>
  );
}
