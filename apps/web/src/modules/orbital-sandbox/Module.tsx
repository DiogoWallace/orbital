"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // O simulador vive fora do ciclo de render: ele muda 60 vezes por segundo, e
  // guardá-lo em estado dispararia um render por quadro.
  const simulatorRef = useRef<OrbitSimulator | null>(null);
  const lastReadoutRef = useRef(0);
  const seriesRef = useRef<{ altitude: ChartPoint[]; speed: ChartPoint[] }>({
    altitude: [],
    speed: [],
  });

  // Sinal de quadro: um contador barato que faz o canvas redesenhar sem
  // carregar a trajetória inteira pelo estado do React.
  const [frame, setFrame] = useState(0);
  const [readout, setReadout] = useState(() => emptyReadout());
  const [series, setSeries] = useState<{ altitude: ChartPoint[]; speed: ChartPoint[] }>({
    altitude: [],
    speed: [],
  });

  const params = useMemo<OrbitParams>(
    () => ({
      centralMass: Number(values.centralMass ?? 1),
      altitude: Number(values.altitude ?? 400),
      speedFactor: Number(values.speedFactor ?? 1),
      flightAngle: Number(values.flightAngle ?? 0),
    }),
    [values],
  );

  if (simulatorRef.current === null) {
    simulatorRef.current = new OrbitSimulator(params);
  }

  // Mudar qualquer variável recomeça a trajetória: manter o rastro antigo
  // misturaria duas físicas diferentes no mesmo desenho. Um efeito sobre
  // `params`, e não uma chamada dentro de cada handler, garante que a regra
  // valha para slider, preset e restauração sem se repetir três vezes.
  useEffect(() => {
    simulatorRef.current?.reset(params);
    seriesRef.current = { altitude: [], speed: [] };
    setSeries({ altitude: [], speed: [] });
    setReadout(readFrom(simulatorRef.current));
    setFrame((value) => value + 1);
  }, [params]);

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
      const simulator = simulatorRef.current;
      if (!simulator) return;

      simulator.advance(fixedStep, substeps);
      setFrame((value) => value + 1);

      if (simulator.current.impacted) {
        setRunning(false);
      }

      // Mostradores e gráfico atualizam a 10 Hz, não a 60: o olho não lê um
      // número que muda 60 vezes por segundo, e renderizar tudo isso custaria
      // mais que a própria simulação.
      const now = performance.now();
      if (now - lastReadoutRef.current < READOUT_INTERVAL) return;
      lastReadoutRef.current = now;

      const elements = simulator.elements;
      const minutes = simulator.current.time / 60;

      pushPoint(seriesRef.current.altitude, { x: minutes, y: elements.altitude });
      pushPoint(seriesRef.current.speed, { x: minutes, y: elements.speed });

      setReadout(readFrom(simulator));
      setSeries({
        altitude: [...seriesRef.current.altitude],
        speed: [...seriesRef.current.speed],
      });
    },
    { running, fixedStep: FIXED_STEP, timeScale },
  );

  const impacted = simulatorRef.current?.current.impacted ?? false;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        <Panel className="overflow-hidden">
          <div
            className="grid-paper relative aspect-[4/3] w-full"
            style={{ containIntrinsicSize: "600px 450px" }}
          >
            <OrbitCanvas simulator={simulatorRef.current} frameSignal={frame} />

            {impacted ? (
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
                  points={series[chart.key as "altitude" | "speed"] ?? []}
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

function pushPoint(series: ChartPoint[], point: ChartPoint): void {
  series.push(point);

  if (series.length > MAX_SERIES_POINTS) {
    series.shift();
  }
}

function emptyReadout() {
  return { values: {} as Record<string, number>, elapsed: 0 };
}

function readFrom(simulator: OrbitSimulator | null) {
  if (!simulator) return emptyReadout();

  const elements = simulator.elements;

  return {
    elapsed: simulator.current.time,
    values: {
      apoapsis: elements.apoapsis,
      periapsis: elements.periapsis,
      eccentricity: elements.eccentricity,
      period: elements.period,
      specificEnergy: elements.specificEnergy,
    },
  };
}
