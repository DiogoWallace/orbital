"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { LineChart } from "@/components/data/LineChart";
import { ParameterPanel } from "@/components/lab/ParameterPanel";
import { ReadoutGrid } from "@/components/lab/ReadoutGrid";
import { RunRecorder } from "@/components/lab/RunRecorder";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import type { Dataset, DatasetSeries } from "@/lib/api/types";
import {
  defaultValues,
  type ModuleComponentProps,
  type ParameterValues,
} from "@/modules/types";
import { decimate } from "./data/decimate";
import { OBSERVATION_WINDOW, TARGETS, TARGET_BY_KEY } from "./data/targets";
import { analyse, type AnalysisResult } from "./simulation/analysis";
import { generateLightCurve, type LightCurve } from "./simulation/synthetic";

/**
 * Módulo "Trânsito de exoplanetas".
 *
 * Analisa duas classes de curva, e a distinção entre elas é conteúdo, não
 * detalhe de implementação:
 *
 * **Observações** vêm de `datasets`, com procedência — missão, arquivo de
 * origem, soma de verificação, data de obtenção. São dado real, e ninguém sabe
 * a resposta de antemão.
 *
 * **Curvas de referência** são sintéticas, geradas aqui, e nelas a resposta é
 * conhecida porque nós a injetamos. Servem para calibrar o olho antes de
 * apontar o método para dado de verdade — e para responder "o método está
 * errado ou o dado é difícil?", que sem elas é indistinguível.
 *
 * A procedência é renderizada junto do gráfico, e não escondida atrás de um
 * link. É a mesma regra das imagens do Webb: dado sem crédito ao lado é uma
 * dívida esperando vencer (ADR 0014).
 */

const CHART_BUCKETS = 320;

type Selecao =
  | { tipo: "dataset"; chave: string }
  | { tipo: "referencia"; chave: string };

/**
 * Nota editorial de uma série observacional, vinda do `spec`.
 *
 * O que a curva ensina é conteúdo do módulo, não do dataset: a mesma série
 * ensinaria outra coisa num módulo de variabilidade estelar. O dataset guarda
 * procedência; o significado mora no `spec`, ligado pelo slug.
 *
 * Nota sem série, ou série sem nota, simplesmente não aparece — mesma
 * tolerância que o registry tem com módulo sem componente.
 */
const notaSchema = z.object({
  slug: z.string(),
  label: z.string(),
  brief: z.string().optional(),
  lesson: z.string().optional(),
  published: z
    .object({
      period: z.number(),
      depthPercent: z.number(),
      durationHours: z.number(),
    })
    .nullable()
    .optional(),
});

type Nota = z.infer<typeof notaSchema>;

function lerNotas(spec: unknown): Record<string, Nota> {
  const bruto = (spec as { datasets?: unknown })?.datasets;
  const resultado = z.array(notaSchema).safeParse(bruto ?? []);

  if (!resultado.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[orbital] notas de dataset inválidas:", resultado.error.issues);
    }

    return {};
  }

  return Object.fromEntries(resultado.data.map((nota) => [nota.slug, nota]));
}

export default function TransitExplorerModule({ module, spec }: ModuleComponentProps) {
  const initialValues = useMemo(() => defaultValues(spec), [spec]);

  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [selecao, setSelecao] = useState<Selecao>({
    tipo: "referencia",
    chave: TARGETS[0].key,
  });

  /**
   * Série e falha carregam a chave do alvo a que pertencem, e o resultado
   * também.
   *
   * É o que evita um efeito que limpa estado a cada troca de alvo: em vez de
   * apagar, deriva-se. Trocar de alvo passa a ser uma comparação de chave, e
   * não uma cascata de `setState` dentro de efeito — que além de proibido pelo
   * lint tem o defeito real de renderizar uma vez com o resultado do alvo
   * anterior ainda na tela.
   */
  const [serie, setSerie] = useState<{ chave: string; curva: LightCurve } | null>(null);
  const [falha, setFalha] = useState<{ chave: string; mensagem: string } | null>(null);

  const [values, setValues] = useState<ParameterValues>(initialValues);
  const [analise, setAnalise] = useState<
    { chave: string; assinatura: string; dados: AnalysisResult } | null
  >(null);

  const dataset = useMemo(
    () =>
      selecao.tipo === "dataset"
        ? (datasets ?? []).find((item) => item.slug === selecao.chave) ?? null
        : null,
    [datasets, selecao],
  );

  const referencia = selecao.tipo === "referencia" ? TARGET_BY_KEY[selecao.chave] : null;

  const notas = useMemo(() => lerNotas(spec), [spec]);
  const nota = dataset ? notas[dataset.slug] : undefined;

  // --- Catálogo de observações ---------------------------------------------
  useEffect(() => {
    let cancelado = false;

    fetch("/api/datasets")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falhou"))))
      .then((payload: { data: Dataset[] }) => {
        if (cancelado) return;

        setDatasets(payload.data ?? []);

        // Havendo observação, ela é o padrão: dado real vem primeiro, e a
        // curva de referência é a que se escolhe deliberadamente.
        if (payload.data?.length) {
          setSelecao({ tipo: "dataset", chave: payload.data[0].slug });
        }
      })
      .catch(() => {
        // Catálogo indisponível não pode derrubar o módulo: as curvas de
        // referência continuam servindo, e são justamente as que não dependem
        // de rede.
        if (!cancelado) setDatasets([]);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  /**
   * A curva de referência é derivada, não buscada.
   *
   * Ela é determinística e barata: recalcular a partir da semente custa menos
   * que guardar, e mantém a fonte única.
   */
  const curvaReferencia = useMemo(() => {
    if (selecao.tipo !== "referencia") return null;

    const caso = TARGET_BY_KEY[selecao.chave];

    return caso ? generateLightCurve({ ...OBSERVATION_WINDOW, ...caso.options }) : null;
  }, [selecao]);

  const curva =
    selecao.tipo === "referencia"
      ? curvaReferencia
      : serie?.chave === selecao.chave
        ? serie.curva
        : null;

  const erroCurva = falha?.chave === selecao.chave ? falha.mensagem : null;
  const carregando = selecao.tipo === "dataset" && curva === null && erroCurva === null;

  // --- Busca da série observacional ----------------------------------------
  useEffect(() => {
    if (selecao.tipo !== "dataset") return;

    const chave = selecao.chave;
    let cancelado = false;

    fetch(`/api/datasets/${encodeURIComponent(chave)}/series`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falhou"))))
      .then((payload: { data: DatasetSeries }) => {
        if (cancelado) return;

        setSerie({
          chave,
          curva: {
            time: Float64Array.from(payload.data.time),
            flux: Float64Array.from(payload.data.flux),
          },
        });
      })
      .catch(() => {
        if (!cancelado) {
          setFalha({ chave, mensagem: "Não foi possível carregar esta série." });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [selecao]);

  const assinatura = useMemo(
    () => JSON.stringify({ selecao, values }),
    [selecao, values],
  );

  const result = analise?.chave === selecao.chave ? analise.dados : null;
  const desatualizado = result !== null && analise?.assinatura !== assinatura;

  const executar = useCallback(() => {
    if (!curva) return;

    setAnalise({
      chave: selecao.chave,
      assinatura,
      dados: analyse(curva, {
        detrendWindowDays: Number(values.detrendWindowDays ?? 0.5),
        bls: {
          minPeriod: Number(values.minPeriod ?? 0.5),
          maxPeriod: Number(values.maxPeriod ?? 12),
          periodCount: Number(values.periodCount ?? 1500),
          bins: Number(values.bins ?? 160),
          maxDuty: Number(values.maxDuty ?? 0.12),
        },
      }),
    });
  }, [assinatura, curva, selecao.chave, values]);

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
    () => (curva ? decimate(curva.time, curva.flux, CHART_BUCKETS) : []),
    [curva],
  );

  const series: Record<string, ReturnType<typeof decimate>> = {
    raw: bruta,
    detrended: result
      ? decimate(result.detrended.time, result.detrended.flux, CHART_BUCKETS)
      : [],
    periodogram: result
      ? decimate(result.periodogram.periods, result.periodogram.power, CHART_BUCKETS)
      : [],
    folded: result?.folded
      ? decimate(result.folded.phase, result.folded.flux, CHART_BUCKETS)
      : [],
  };

  const leituras: Record<string, number> = {
    period: result?.candidate?.period ?? 0,
    depthPercent: (result?.candidate?.depth ?? 0) * 100,
    durationHours: (result?.candidate?.durationDays ?? 0) * 24,
    snr: result?.snr ?? 0,
    power: (result?.candidate?.power ?? 0) * 1000,
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          title="Alvos"
          description="Observações reais com procedência, e curvas de referência em que a resposta é conhecida."
        />

        <div className="flex flex-col gap-4 px-5 py-4">
          <Grupo
            titulo="Observações"
            vazio={
              datasets === null
                ? "carregando…"
                : "nenhuma série ingerida ainda — use as de referência abaixo"
            }
          >
            {(datasets ?? []).map((item) => (
              <Alvo
                key={item.slug}
                ativo={selecao.tipo === "dataset" && selecao.chave === item.slug}
                codigo={item.provenance.missionLabel}
                rotulo={notas[item.slug]?.label ?? item.title}
                onClick={() => setSelecao({ tipo: "dataset", chave: item.slug })}
              />
            ))}
          </Grupo>

          <Grupo titulo="Curvas de referência (sintéticas)">
            {TARGETS.map((item) => (
              <Alvo
                key={item.key}
                ativo={selecao.tipo === "referencia" && selecao.chave === item.key}
                codigo={item.designation}
                rotulo={item.label}
                onClick={() => setSelecao({ tipo: "referencia", chave: item.key })}
              />
            ))}
          </Grupo>
        </div>

        {nota?.brief || referencia ? (
          <p className="border-t border-[var(--color-line)] px-5 py-3.5 text-[13px] leading-relaxed text-[var(--color-neutral-300)]">
            {nota?.brief ?? referencia?.brief}
          </p>
        ) : null}

        {dataset ? <Procedencia dataset={dataset} /> : null}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={executar} disabled={!curva || carregando}>
              <Search size={14} aria-hidden />
              {result ? "Analisar de novo" : "Analisar"}
            </Button>

            {carregando ? (
              <span className="text-xs text-[var(--color-neutral-500)]">
                carregando a série…
              </span>
            ) : null}

            {curva && !carregando ? (
              <span className="tabular text-xs text-[var(--color-neutral-500)]">
                {curva.time.length.toLocaleString("pt-BR")} pontos
              </span>
            ) : null}

            {desatualizado ? (
              <span className="text-xs text-[var(--color-signal-warn)]">
                Os parâmetros mudaram desde esta análise.
              </span>
            ) : null}

            {erroCurva ? (
              <span className="text-xs text-[var(--color-signal-danger)]">{erroCurva}</span>
            ) : null}
          </div>

          {result ? (
            <>
              <ReadoutGrid outputs={spec.outputs} values={leituras} />

              <Panel>
                <PanelHeader title="Leitura do resultado" />
                <div className="flex flex-col gap-3.5 px-5 py-5 text-[15px] leading-relaxed">
                  {nota?.published && result?.candidate ? (
                    <Comparacao
                      publicado={nota.published}
                      periodo={result.candidate.period}
                      profundidade={result.candidate.depth * 100}
                      duracao={result.candidate.durationDays * 24}
                    />
                  ) : null}

                  {(nota?.lesson ?? referencia?.lesson ?? "")
                    .split("\n\n")
                    .filter(Boolean)
                    .map((paragrafo, indice) => (
                      <p key={indice} className="text-[var(--color-neutral-300)]">
                        {paragrafo}
                      </p>
                    ))}

                  {!nota && !referencia ? (
                    <p className="text-[var(--color-neutral-300)]">
                      Esta é uma observação real: ninguém injetou nada nela, e o
                      valor de referência para comparar vem da literatura, não
                      deste módulo.
                    </p>
                  ) : null}

                  <p className="rule-top pt-3.5 text-[13px] text-[var(--color-neutral-500)]">
                    Um pico no periodograma e uma relação sinal/ruído alta indicam
                    que existe um sinal periódico com forma de caixa — e nada além
                    disso. Confirmar que a causa é um planeta exige descartar
                    binária eclipsante, contaminação por estrela vizinha e artefato
                    do instrumento, e depois observação independente. Este módulo
                    mostra o primeiro passo, não a conclusão.
                  </p>
                </div>
              </Panel>

              <RunRecorder
                moduleSlug={module.slug}
                // O dado analisado entra nos parâmetros da execução: sem isso a
                // execução não consegue nomear a série sobre a qual rodou, e
                // deixa de ser reproduzível (ADR 0014).
                parameters={{
                  ...values,
                  dataset: dataset?.slug ?? referencia?.designation ?? "desconhecido",
                }}
                summary={leituras}
                modelVersion={spec.modelVersion}
              />
            </>
          ) : (
            <Panel className="px-6 py-12 text-center">
              <p className="text-sm text-[var(--color-neutral-500)]">
                {carregando
                  ? "Carregando a série…"
                  : "Escolha um alvo, ajuste o método e execute a análise."}
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

function Grupo({
  titulo,
  vazio,
  children,
}: {
  titulo: string;
  vazio?: string;
  children: React.ReactNode;
}) {
  const temFilhos = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div>
      <h6 className="text-[var(--color-neutral-500)]">{titulo}</h6>
      <div className="mt-2 flex flex-wrap gap-2">
        {temFilhos ? (
          children
        ) : (
          <span className="text-xs text-[var(--color-neutral-600)]">{vazio}</span>
        )}
      </div>
    </div>
  );
}

function Alvo({
  ativo,
  codigo,
  rotulo,
  onClick,
}: {
  ativo: boolean;
  codigo: string;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={
        ativo
          ? "rounded-[var(--radius-control)] border border-[var(--color-accent)] px-3 py-2 text-left text-xs text-[var(--color-accent-300)]"
          : "rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-2 text-left text-xs text-[var(--color-neutral-400)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
      }
    >
      <span className="tabular block text-[10px] text-[var(--color-neutral-600)]">
        {codigo}
      </span>
      {rotulo}
    </button>
  );
}

/**
 * O recuperado ao lado do publicado.
 *
 * É esta tabela que separa exercício de brinquedo: sem um valor independente
 * para comparar, o número que o método devolve não pode ser julgado. A fonte é
 * a tabela TOI do NASA Exoplanet Archive, e ela viaja no `spec` justamente
 * para que a comparação não dependa de o leitor ir procurar.
 *
 * O erro relativo aparece só no período. Profundidade e duração saem
 * sistematicamente por baixo, porque a caixa do BLS é mais larga que o trânsito
 * — exibir isso como "erro" sugeriria defeito onde há comportamento conhecido.
 */
function Comparacao({
  publicado,
  periodo,
  profundidade,
  duracao,
}: {
  publicado: { period: number; depthPercent: number; durationHours: number };
  periodo: number;
  profundidade: number;
  duracao: number;
}) {
  const erro = Math.abs(periodo - publicado.period) / publicado.period;

  const linhas: [string, string, string][] = [
    ["Período", `${publicado.period.toFixed(4)} d`, `${periodo.toFixed(4)} d`],
    ["Profundidade", `${publicado.depthPercent.toFixed(3)} %`, `${profundidade.toFixed(3)} %`],
    ["Duração", `${publicado.durationHours.toFixed(2)} h`, `${duracao.toFixed(2)} h`],
  ];

  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h6 className="text-[var(--color-neutral-500)]">Publicado × recuperado</h6>
        <span className="tabular text-[11px] text-[var(--color-accent-300)]">
          erro no período: {(erro * 100).toFixed(2)}%
        </span>
      </div>

      <table className="mt-2.5 w-full text-[13px]">
        <tbody>
          {linhas.map(([rotulo, publicadoTexto, medido]) => (
            <tr key={rotulo}>
              <td className="py-1 text-[var(--color-neutral-500)]">{rotulo}</td>
              <td className="tabular py-1 text-right text-[var(--color-neutral-400)]">
                {publicadoTexto}
              </td>
              <td className="tabular py-1 pl-4 text-right text-[var(--color-ink)]">{medido}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[11px] text-[var(--color-neutral-600)]">
        Valores publicados: NASA Exoplanet Archive, tabela TOI.
      </p>
    </div>
  );
}

/**
 * De onde este dado veio.
 *
 * Renderizada junto do alvo, e não atrás de um link: a procedência é parte do
 * dado, e um número sem ela não é citável nem verificável. Quando falta soma de
 * verificação ou citação, isso aparece — dívida escondida não é paga.
 */
function Procedencia({ dataset }: { dataset: Dataset }) {
  const campos: [string, string | null][] = [
    ["Missão", dataset.provenance.missionFullName],
    ["Instrumento", dataset.provenance.instrument],
    ["Produto", dataset.provenance.product],
    ["Máscara", dataset.provenance.qualityMask],
    ["Arquivo", dataset.provenance.archive],
    ["Setor", dataset.sector !== null ? String(dataset.sector) : null],
    [
      "Cadência",
      dataset.cadenceSeconds ? `${dataset.cadenceSeconds} s` : null,
    ],
    [
      "Obtido em",
      dataset.provenance.retrievedAt
        ? new Date(dataset.provenance.retrievedAt).toLocaleDateString("pt-BR")
        : null,
    ],
    ["Pontos", dataset.points.toLocaleString("pt-BR")],
  ];

  return (
    <div className="border-t border-[var(--color-line)] px-5 py-4">
      <h6 className="text-[var(--color-neutral-500)]">Procedência</h6>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {campos
          .filter(([, valor]) => valor)
          .map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-[10px] tracking-[0.08em] text-[var(--color-neutral-600)] uppercase">
                {rotulo}
              </dt>
              <dd className="tabular text-[13px] text-[var(--color-neutral-300)]">{valor}</dd>
            </div>
          ))}
      </dl>

      {dataset.provenance.citation ? (
        <p className="mt-3.5 text-[12px] leading-relaxed text-[var(--color-neutral-500)]">
          {dataset.provenance.citation}
        </p>
      ) : (
        <p className="mt-3.5 text-[12px] leading-relaxed text-[var(--color-signal-warn)]">
          Sem {dataset.provenance.sha256 ? "citação" : "soma de verificação"}: esta
          série ainda não é citável. Um resultado tirado dela não pode ser
          referenciado até isso ser preenchido.
        </p>
      )}
    </div>
  );
}
