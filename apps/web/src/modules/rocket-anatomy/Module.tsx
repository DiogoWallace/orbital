"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { LineChart, type ChartPoint } from "@/components/data/LineChart";
import { ParameterPanel } from "@/components/lab/ParameterPanel";
import { ReadoutGrid } from "@/components/lab/ReadoutGrid";
import { RunRecorder } from "@/components/lab/RunRecorder";
import { SimulationControls } from "@/components/lab/SimulationControls";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useSimulationLoop } from "@/hooks/useSimulationLoop";
import {
  defaultValues,
  type ModuleComponentProps,
  type ParameterValues,
} from "@/modules/types";
import { RocketCutaway } from "./components/RocketCutaway";
import { SHAPE_BY_KEY } from "./data/geometry";
import { TELEMETRY_BY_PART } from "./data/telemetry";
import { AscentSimulator, type AscentParams } from "./simulation/ascent";

/**
 * Módulo "Anatomia de um foguete".
 *
 * Segundo módulo da plataforma, e o que exerce o contrato do ADR 0005 em dois
 * formatos ao mesmo tempo: anatomia — doze sistemas selecionáveis num corte —
 * e simulação de ascensão. O `spec` carrega `hotspots` **e** `parameters`; o
 * núcleo lê os segundos para montar o painel e ignora os primeiros sem
 * precisar saber que os dois convivem.
 *
 * A costura entre as duas metades é o que dá sentido ao conjunto: com o voo em
 * andamento, o sistema selecionado mostra as leituras que dizem respeito a ele.
 * A pergunta sobre a estrutura vem acompanhada da pressão dinâmica no instante
 * em que ela é máxima.
 */

/** Passo de integração, em segundos simulados. */
const FIXED_STEP = 0.05;

/** Intervalo de atualização dos mostradores e do gráfico, em ms. */
const READOUT_INTERVAL = 100;

/** Teto de pontos por série: mantém o SVG do gráfico barato. */
const MAX_SERIES_POINTS = 600;

/**
 * Uma ascensão dura minutos, não horas. As escalas do padrão do núcleo —
 * pensadas para órbita — atravessariam o voo inteiro antes do primeiro quadro.
 */
const SPEEDS = [1, 2, 5, 10];

const hotspotSchema = z.object({
  key: z.string(),
  label: z.string(),
  question: z.string().optional(),
  body: z.string().optional(),
});

type Hotspot = z.infer<typeof hotspotSchema>;

/**
 * Lê os pontos de interesse sem nunca lançar.
 *
 * Mesma disciplina do `parseModuleSpec` do núcleo: conteúdo é editorial, e
 * conteúdo editorial erra. Um `spec` malformado degrada o módulo para a
 * simulação sozinha — não derruba a página.
 */
function lerHotspots(spec: unknown): Hotspot[] {
  const bruto = (spec as { hotspots?: unknown })?.hotspots;
  const resultado = z.array(hotspotSchema).safeParse(bruto ?? []);

  if (!resultado.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[orbital] hotspots inválidos:", resultado.error.issues);
    }

    return [];
  }

  // Sistema descrito no banco mas ainda sem traçado não é erro: é conteúdo que
  // chegou antes do desenho. Fica de fora do corte em vez de virar uma peça
  // invisível e inalcançável.
  return resultado.data.filter((hotspot) => hotspot.key in SHAPE_BY_KEY);
}

export default function RocketAnatomyModule({ module, spec }: ModuleComponentProps) {
  const hotspots = useMemo(() => lerHotspots(spec), [spec]);
  const initialValues = useMemo(() => defaultValues(spec), [spec]);

  const [selecionado, setSelecionado] = useState(() => hotspots[0]?.key ?? "");
  const [values, setValues] = useState<ParameterValues>(initialValues);
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1);

  const params = useMemo<AscentParams>(() => toParams(values), [values]);

  /**
   * Simulador e séries nascem juntos e morrem juntos.
   *
   * Mudar uma variável cria um simulador novo em vez de reiniciar o antigo:
   * os gráficos zeram por construção, sem efeito colateral, e misturar duas
   * configurações no mesmo traçado deixa de ser possível.
   */
  const world = useMemo(
    () => ({
      simulator: new AscentSimulator(params),
      series: {
        altitude: [] as ChartPoint[],
        velocity: [] as ChartPoint[],
        dynamicPressure: [] as ChartPoint[],
      },
    }),
    [params],
  );

  const [tick, setTick] = useState(0);
  const lastReadoutRef = useRef(0);

  const readout = useMemo(
    () => world.simulator.readout,
    // `tick` entra como dependência de propósito: é o sinal de que o estado
    // interno do simulador avançou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, tick],
  );

  const charts = useMemo(
    () => ({
      altitude: [...world.series.altitude],
      velocity: [...world.series.velocity],
      dynamicPressure: [...world.series.dynamicPressure],
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

      // Voltar ao solo encerra o voo: continuar rodando só acumularia quadros
      // idênticos e daria a impressão de que a simulação travou.
      if (simulator.current.landed) {
        setRunning(false);
      }

      const now = performance.now();
      if (now - lastReadoutRef.current < READOUT_INTERVAL) return;
      lastReadoutRef.current = now;

      const leitura = simulator.readout;
      const t = simulator.current.time;

      pushPoint(series.altitude, { x: t, y: leitura.altitude });
      pushPoint(series.velocity, { x: t, y: leitura.velocity });
      pushPoint(series.dynamicPressure, { x: t, y: leitura.dynamicPressure });

      setTick((value) => value + 1);
    },
    { running, fixedStep: FIXED_STEP, timeScale },
  );

  const atual = hotspots.find((hotspot) => hotspot.key === selecionado) ?? hotspots[0];

  const leiturasDaPeca = useMemo(() => {
    if (!atual) return [];

    const chaves = TELEMETRY_BY_PART[atual.key] ?? [];

    return spec.outputs.filter((output) => chaves.includes(output.key));
  }, [atual, spec.outputs]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <Panel className="overflow-hidden">
          <div className="grid-paper aspect-[3/4] w-full px-4 py-3">
            {atual ? (
              <RocketCutaway
                parts={hotspots}
                selected={atual.key}
                onSelect={setSelecionado}
              />
            ) : null}
          </div>
        </Panel>

        <p className="text-xs leading-relaxed text-[var(--color-neutral-500)]">
          Selecione um sistema no corte, ou percorra com as setas do teclado. O
          esquema é conceitual: proporções e disposição servem à leitura, não a um
          veículo específico.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {atual ? (
          <Panel>
            <PanelHeader title="Sistema" description="Um de cada vez, e por quê." />

            {/* O texto troca sem recarregar a página: sem `aria-live`, quem usa
                leitor de tela selecionaria uma peça e não ouviria nada mudar. */}
            <div className="px-5 py-5" aria-live="polite">
              <h3 className="text-[22px] tracking-[-0.02em]">{atual.label}</h3>

              {atual.question ? (
                <p className="mt-3 border-l-2 border-[var(--color-accent)] pl-3.5 text-[15px] leading-relaxed text-[var(--color-text)]">
                  {atual.question}
                </p>
              ) : null}

              {atual.body ? (
                <div className="mt-4 flex flex-col gap-3.5 text-[15px] leading-relaxed text-[var(--color-neutral-300)]">
                  {atual.body.split("\n\n").map((paragrafo, indice) => (
                    <p key={indice}>{paragrafo}</p>
                  ))}
                </div>
              ) : null}

              {leiturasDaPeca.length > 0 ? (
                <div className="rule-top mt-5 pt-4">
                  <h6 className="text-[var(--color-neutral-500)]">Neste instante</h6>
                  <div className="mt-3">
                    <ReadoutGrid outputs={leiturasDaPeca} values={readout} />
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-5">
            <SimulationControls
              running={running}
              timeScale={timeScale}
              elapsed={world.simulator.current.time}
              speeds={SPEEDS}
              onToggle={() => setRunning((value) => !value)}
              onReset={handleReset}
              onTimeScale={setTimeScale}
            />

            <ReadoutGrid outputs={spec.outputs} values={readout} />

            <RunRecorder
              moduleSlug={module.slug}
              parameters={values}
              summary={readout}
              modelVersion={spec.modelVersion}
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              {spec.charts.map((chart) => (
                <Panel key={chart.key}>
                  <PanelHeader title={chart.label} />
                  <div className="px-2 py-3">
                    <LineChart
                      points={charts[chart.key as keyof typeof charts] ?? []}
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
      </div>
    </div>
  );
}

/** Converte os valores do painel nos parâmetros que a física entende. */
function toParams(values: ParameterValues): AscentParams {
  return {
    throatArea: Number(values.throatArea ?? 1000),
    chamberPressure: Number(values.chamberPressure ?? 100),
    expansionRatio: Number(values.expansionRatio ?? 16),
    propellantMass: Number(values.propellantMass ?? 120),
    dryMass: Number(values.dryMass ?? 12),
    throttle: Number(values.throttle ?? 100),
  };
}

function pushPoint(series: ChartPoint[], point: ChartPoint): void {
  series.push(point);

  if (series.length > MAX_SERIES_POINTS) {
    series.shift();
  }
}
