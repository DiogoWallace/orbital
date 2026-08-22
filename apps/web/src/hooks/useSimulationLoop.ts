"use client";

import { useEffect, useRef } from "react";

interface LoopOptions {
  /** Pausa sem desmontar nada. */
  running: boolean;
  /** Passo fixo de integração, em segundos de tempo simulado. */
  fixedStep: number;
  /** Quantos segundos simulados por segundo real. */
  timeScale: number;
  /**
   * Teto de passos por quadro.
   *
   * Sem ele, uma aba que ficou em segundo plano volta com um acúmulo enorme e
   * o navegador congela tentando alcançar o tempo perdido — a "espiral da
   * morte" do timestep fixo.
   */
  maxSubsteps?: number;
}

/**
 * Laço de simulação com passo fixo (ADR 0007).
 *
 * O passo é fixo e o acumulador absorve a variação do `requestAnimationFrame`:
 * a mesma entrada produz a mesma trajetória em qualquer máquina, a 60 Hz ou a
 * 144 Hz. Integrar direto com o delta do quadro tornaria a física dependente do
 * monitor do usuário.
 */
export function useSimulationLoop(
  onStep: (fixedStep: number, substeps: number) => void,
  { running, fixedStep, timeScale, maxSubsteps = 240 }: LoopOptions,
): void {
  // O callback vive numa ref para que mudar de closure não reinicie o laço —
  // reiniciar a cada render descartaria o acumulador e travaria a animação.
  const callbackRef = useRef(onStep);
  callbackRef.current = onStep;

  const optionsRef = useRef({ fixedStep, timeScale, maxSubsteps });
  optionsRef.current = { fixedStep, timeScale, maxSubsteps };

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;

    const tick = (now: number) => {
      const { fixedStep: dt, timeScale: scale, maxSubsteps: cap } = optionsRef.current;

      // Delta real limitado a 250 ms: acima disso a aba estava oculta, e o que
      // se quer ao voltar é continuar, não reproduzir o tempo perdido.
      const elapsed = Math.min((now - previous) / 1000, 0.25);
      previous = now;

      accumulator += elapsed * scale;

      const substeps = Math.min(Math.floor(accumulator / dt), cap);

      if (substeps > 0) {
        accumulator -= substeps * dt;
        callbackRef.current(dt, substeps);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [running]);
}
