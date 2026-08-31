"use client";

import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LineChart } from "@/components/data/LineChart";
import { ParameterPanel } from "@/components/lab/ParameterPanel";
import { ReadoutGrid } from "@/components/lab/ReadoutGrid";
import { RunRecorder } from "@/components/lab/RunRecorder";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  defaultValues,
  type ModuleComponentProps,
  type ParameterValues,
} from "@/modules/types";
import { decimate } from "./data/decimate";
import { OBSERVATION_WINDOW, TARGETS, TARGET_BY_KEY } from "./data/targets";
import { analyse, type AnalysisResult } from "./simulation/analysis";
import { generateLightCurve } from "./simulation/synthetic";

/**
 * Módulo "Trânsito de exoplanetas".
 *
 * Terceiro módulo, e o primeiro que **analisa** em vez de simular. A diferença
 * aparece na interação: não há laço a 60 fps nem transporte de play/pause. Há
 * um alvo, parâmetros de análise, e um comando explícito para executar.
 *
 * Essa escolha não é só de desempenho. Analisar é um ato: você configura um
 * método, roda, e o que sai vale ser guardado e citado. Recalcular sozinho a
 * cada arrastar de slider transformaria o resultado em efeito visual e apagaria
 * a fronteira entre configurar e concluir — que é exatamente a fronteira que o
 * ADR 0014 existe para proteger.
 *
 * **O alvo não é um parâmetro.** Qual dado se analisa e como se analisa são
 * elos diferentes da cadeia de reprodutibilidade, e misturá-los no mesmo painel
 * embaralharia os dois. Quando os alvos reais chegarem, este seletor vira a
 * lista de `datasets` e o resto do módulo não muda.
 */

/** Baldes de desenho: o suficiente para a forma, longe do limite do SVG. */
const CHART_BUCKETS = 320;

export default function TransitExplorerModule({ module, spec }: ModuleComponentProps) {
  const initialValues = useMemo(() => defaultValues(spec), [spec]);

  const [targetKey, setTargetKey] = useState(TARGETS[0].key);
  const [values, setValues] = useState<ParameterValues>(initialValues);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  /** Quais valores produziram o resultado que está na tela. */
  const [analysedWith, setAnalysedWith] = useState<string | null>(null);

  const target = TARGET_BY_KEY[targetKey] ?? TARGETS[0];

  const curve = useMemo(
    () => generateLightCurve({ ...OBSERVATION_WINDOW, ...target.options }),
    [target],
  );

  const assinatura = useMemo(
    () => JSON.stringify({ targetKey, values }),
    [targetKey, values],
  );

  const desatualizado = result !== null && analysedWith !== assinatura;

  const executar = useCallback(() => {
    setResult(
      analyse(curve, {
        detrendWindowDays: Number(values.detrendWindowDays ?? 0.5),
        bls: {
          minPeriod: Number(values.minPeriod ?? 0.5),
          maxPeriod: Number(values.maxPeriod ?? 12),
          periodCount: Number(values.periodCount ?? 1500),
          bins: Number(values.bins ?? 160),
          maxDuty: Number(values.maxDuty ?? 0.12),
        },
      }),
    );
    setAnalysedWith(assinatura);
  }, [assinatura, curve, values]);

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

  const handleReset = useCallback(() => setValues(initialValues), [initialValues]);

  const bruta = useMemo(
    () => decimate(curve.time, curve.flux, CHART_BUCKETS),
    [curve],
  );

  const achatada = useMemo(
    () => (result ? decimate(result.detrended.time, result.detrended.flux, CHART_BUCKETS) : []),
    [result],
  );

  const periodograma = useMemo(
    () =>
      result
        ? decimate(result.periodogram.periods, result.periodogram.power, CHART_BUCKETS)
        : [],
    [result],
  );

  const dobrada = useMemo(
    () => (result?.folded ? decimate(result.folded.phase, result.folded.flux, CHART_BUCKETS) : []),
    [result],
  );

  const leituras: Record<string, number> = {
    period: result?.candidate?.period ?? 0,
    depthPercent: (result?.candidate?.depth ?? 0) * 100,
    durationHours: (result?.candidate?.durationDays ?? 0) * 24,
    snr: result?.snr ?? 0,
    power: (result?.candidate?.power ?? 0) * 1000,
  };

  const series: Record<string, typeof bruta> = {
    raw: bruta,
    detrended: achatada,
    periodogram: periodograma,
    folded: dobrada,
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Alvos"
          description="Cinco curvas sintéticas. Nenhuma é observação real — as designações começam com SIN- por isso."
        />
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {TARGETS.map((item) => {
            const ativo = item.key === target.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTargetKey(item.key);
                  setResult(null);
                  setAnalysedWith(null);
                }}
                aria-pressed={ativo}
                className={
                  ativo
                    ? "rounded-[var(--radius-control)] border border-[var(--color-accent)] px-3 py-2 text-left text-xs text-[var(--color-accent-300)]"
                    : "rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-2 text-left text-xs text-[var(--color-neutral-400)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                }
              >
                <span className="tabular block text-[10px] text-[var(--color-neutral-600)]">
                  {item.designation}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="border-t border-[var(--color-line)] px-5 py-3.5 text-[13px] leading-relaxed text-[var(--color-neutral-300)]">
          {target.brief}
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={executar}>
              <Search size={14} aria-hidden />
              {result ? "Analisar de novo" : "Analisar"}
            </Button>

            {desatualizado ? (
              <span className="text-xs text-[var(--color-signal-warn)]">
                Os parâmetros mudaram desde esta análise.
              </span>
            ) : null}
          </div>

          {result ? (
            <>
              <ReadoutGrid outputs={spec.outputs} values={leituras} />

              <Panel>
                <PanelHeader title="Leitura do resultado" />
                <div className="flex flex-col gap-3.5 px-5 py-5 text-[15px] leading-relaxed">
                  <p className="text-[var(--color-neutral-300)]">{target.lesson}</p>

                  <p className="rule-top pt-3.5 text-[13px] text-[var(--color-neutral-500)]">
                    Um pico no periodograma e uma relação sinal/ruído alta indicam
                    que existe um sinal periódico com forma de caixa — e nada
                    além disso. Confirmar que a causa é um planeta exige
                    descartar binária eclipsante, contaminação por estrela
                    vizinha e artefato do instrumento, e depois observação
                    independente. Este módulo mostra o primeiro passo, não a
                    conclusão.
                  </p>
                </div>
              </Panel>

              <RunRecorder
                moduleSlug={module.slug}
                parameters={{ ...values, target: target.designation }}
                summary={leituras}
                modelVersion={spec.modelVersion}
              />
            </>
          ) : (
            <Panel className="px-6 py-12 text-center">
              <p className="text-sm text-[var(--color-neutral-500)]">
                Escolha um alvo, ajuste o método e execute a análise.
              </p>
            </Panel>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {spec.charts.map((chart) => (
              <Panel key={chart.key}>
                <PanelHeader title={chart.label} />
                <div className="px-2 py-3">
                  <LineChart
                    points={series[chart.key] ?? []}
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
  );
}
