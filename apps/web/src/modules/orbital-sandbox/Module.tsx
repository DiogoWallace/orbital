"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { LineChart, type ChartPoint } from "@/components/data/LineChart";
import { ParameterPanel } from "@/components/lab/ParameterPanel";
import { ReadoutGrid } from "@/components/lab/ReadoutGrid";
import { SimulationControls } from "@/components/lab/SimulationControls";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useSimulationLoop } from "@/hooks/useSimulationLoop";
import {
  defaultValues,
  type ModuleComponentProps,
  type ParameterValues,
} from "@/modules/types";
import { OrbitCanvas } from "./components/OrbitCanvas";
import { OrbitSimulator, type OrbitParams } from "./simulation/orbit";

/**
 * Módulo "Laboratório orbital" — implementação de referência (ADR 0005).
 *
 * Repare no que este arquivo **não** faz: não desenha sliders, não formata
 * mostradores, não implementa o laço de animação. Tudo isso vem do núcleo. O
 * módulo contribui com a física (`simulation/`), o desenho (`components/`) e a
 * ligação entre os dois.
 */

/** Passo de integração, em segundos simulados. */
const FIXED_STEP = 1;

/** Intervalo de atualização dos mostradores e do gráfico, em ms. */
const READOUT_INTERVAL = 100;

/** Teto de pontos por série: mantém o SVG do gráfico barato. */
const MAX_SERIES_POINTS = 600;

export default function OrbitalSandboxModule({ spec }: ModuleComponentProps) {
  const initialValues = useMemo(() => defaultValues(spec), [spec]);

  const [values, setValues] = useState<ParameterValues>(initialValues);
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(60);

  const params = useMemo<OrbitParams>(() => toParams(values), [values]);

  /**
   * Simulador e séries nascem juntos e morrem juntos.
   *
   * Mudar uma variável cria um simulador novo em vez de reiniciar o antigo —
   * assim o rastro e os gráficos zeram por construção, sem efeito colateral
   * nem `setState` dentro de efeito. Misturar duas físicas no mesmo desenho
   * deixa de ser possível.
   */
  const world = useMemo(
    () => ({
      simulator: new OrbitSimulator(params),
      series: { altitude: [] as ChartPoint[], speed: [] as ChartPoint[] },
    }),
    [params],
  );

  // Dois relógios: `frame` acompanha o canvas a 60 Hz; `tick` governa
  // mostradores e gráficos a 10 Hz. O olho não lê um número que muda 60 vezes
  // por segundo, e recalcular as séries nessa taxa custaria mais que a própria
  // simulação.
  const [frame, setFrame] = useState(0);
  const [tick, setTick] = useState(0);
  const lastReadoutRef = useRef(0);

  // Derivados, não estado: uma leitura do simulador no instante do `tick`.
  const readout = useMemo(
    () => readFrom(world.simulator),
    // `tick` entra como dependência de propósito: é o sinal de que o estado
    // interno do simulador avançou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, tick],
  );

  const charts = useMemo(
    () => ({
      altitude: [...world.series.altitude],
      speed: [...world.series.speed],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, tick],
  );

  const handleParameterChange = useCallback(
    (key: string, value: number | boolean | string) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handlePreset = useCallback(
    (key: string) => {
      const preset = spec.presets.find((item) => item.key === key);
      if (!preset) return;

      setValues({ ...initialValues, ...preset.values });
    },
    [initialValues, spec.presets],
  );

  const handleReset = useCallback(() => {
    setRunning(false);
    setValues(initialValues);
  }, [initialValues]);

  useSimulationLoop(
    (fixedStep, substeps) => {
      const { simulator, series } = world;

      simulator.advance(fixedStep, substeps);
      setFrame((value) => value + 1);

      if (simulator.current.impacted) {
        setRunning(false);
      }

      const now = performance.now();
      if (now - lastReadoutRef.current < READOUT_INTERVAL) return;
      lastReadoutRef.current = now;

      const elements = simulator.elements;
      const minutes = simulator.current.time / 60;

      pushPoint(series.altitude, { x: minutes, y: elements.altitude });
      pushPoint(series.speed, { x: minutes, y: elements.speed });

      setTick((value) => value + 1);
    },
    { running, fixedStep: FIXED_STEP, timeScale },
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        <Panel className="overflow-hidden">
          <div className="grid-paper relative aspect-[4/3] w-full">
            <OrbitCanvas simulator={world.simulator} frameSignal={frame} />

            {readout.impacted ? (
              <p className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full border border-[var(--color-signal-danger)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-signal-danger)]">
                A trajetória cruzou a superfície.
              </p>
            ) : null}
          </div>
        </Panel>

        <SimulationControls
          running={running}
          timeScale={timeScale}
          elapsed={readout.elapsed}
          onToggle={() => setRunning((value) => !value)}
          onReset={handleReset}
          onTimeScale={setTimeScale}
        />

        <ReadoutGrid outputs={spec.outputs} values={readout.values} />

        <div className="grid gap-5 md:grid-cols-2">
          {spec.charts.map((chart) => (
            <Panel key={chart.key}>
              <PanelHeader title={chart.label} />
              <div className="px-2 py-3">
                <LineChart
                  points={charts[chart.key as "altitude" | "speed"] ?? []}
                  xLabel={chart.xLabel}
                  yLabel={chart.yLabel}
                  className="w-full"
                />
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <ParameterPanel
        spec={spec}
        values={values}
        onChange={handleParameterChange}
        onApplyPreset={handlePreset}
        onReset={handleReset}
      />
    </div>
  );
}

/** Converte os valores do painel nos parâmetros que a física entende. */
function toParams(values: ParameterValues): OrbitParams {
  return {
    centralMass: Number(values.centralMass ?? 1),
    altitude: Number(values.altitude ?? 400),
    speedFactor: Number(values.speedFactor ?? 1),
    flightAngle: Number(values.flightAngle ?? 0),
  };
}

function pushPoint(series: ChartPoint[], point: ChartPoint): void {
  series.push(point);

  if (series.length > MAX_SERIES_POINTS) {
    series.shift();
  }
}

function readFrom(simulator: OrbitSimulator) {
  const elements = simulator.elements;

  return {
    elapsed: simulator.current.time,
    impacted: simulator.current.impacted,
    values: {
      apoapsis: elements.apoapsis,
      periapsis: elements.periapsis,
      eccentricity: elements.eccentricity,
      period: elements.period,
      specificEnergy: elements.specificEnergy,
    },
  };
}
