"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DEFAULT_SPEEDS = [1, 10, 60, 300];

/**
 * Transporte da simulação: rodar, pausar, reiniciar e escolher a escala de tempo.
 *
 * A escala é discreta, e não um slider contínuo, porque os saltos úteis são
 * ordens de grandeza, e um contínuo só dificultaria voltar a um valor já usado.
 *
 * Quais ordens de grandeza, porém, é decisão do módulo, não do núcleo: uma
 * órbita pede 300×, e uma ascensão de três minutos passaria voando nessa
 * escala. Os valores viraram prop quando o segundo módulo mostrou que o padrão
 * era, na verdade, o caso do primeiro.
 */
export function SimulationControls({
  running,
  timeScale,
  elapsed,
  speeds = DEFAULT_SPEEDS,
  onToggle,
  onReset,
  onTimeScale,
}: {
  running: boolean;
  timeScale: number;
  /** Tempo simulado decorrido, em segundos. */
  elapsed: number;
  /** Escalas oferecidas. O padrão serve a fenômenos de horas. */
  speeds?: number[];
  onToggle: () => void;
  onReset: () => void;
  onTimeScale: (scale: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" onClick={onToggle} aria-pressed={running}>
        {running ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
        {running ? "Pausar" : "Simular"}
      </Button>

      <Button onClick={onReset}>
        <RotateCcw size={14} aria-hidden />
        Reiniciar
      </Button>

      <div
        className="flex items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-line)] p-1"
        role="group"
        aria-label="Escala de tempo"
      >
        {speeds.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => onTimeScale(speed)}
            aria-pressed={timeScale === speed}
            className={
              timeScale === speed
                ? "tabular rounded px-2 py-1 text-xs bg-[var(--accent)] text-[var(--color-void)]"
                : "tabular rounded px-2 py-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            }
          >
            {speed}×
          </button>
        ))}
      </div>

      <span className="tabular ml-auto text-xs text-[var(--color-ink-faint)]">
        T + {formatElapsed(elapsed)}
      </span>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}
