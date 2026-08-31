"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import type { ModuleComponentProps } from "@/modules/types";
import { RocketCutaway } from "./components/RocketCutaway";
import { SHAPE_BY_KEY } from "./data/geometry";

/**
 * Módulo "Anatomia de um foguete".
 *
 * É o segundo módulo da plataforma, e o primeiro a exercer o contrato do
 * ADR 0005 fora do formato que o inspirou. Repare no que ele **não** tem:
 * nenhum parâmetro, nenhum mostrador, nenhum laço de simulação. O núcleo não
 * precisou de um único ajuste para isso — o módulo simplesmente não renderiza
 * o painel de controle, porque não tem o que controlar.
 *
 * O `spec` deste módulo não usa `parameters`: usa `hotspots`, uma chave que o
 * schema do núcleo não conhece e deixa passar intacta (ADR 0006). Quem valida
 * a forma dela é este arquivo, e não o núcleo — a extensão é do módulo, e a
 * responsabilidade de conferi-la vem junto.
 */

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
 * conteúdo editorial erra. Um `spec` malformado degrada o módulo para uma
 * explicação de que ainda não há o que mostrar — não derruba a página.
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

  // Um sistema descrito no banco mas ainda sem traçado não é erro: é conteúdo
  // que chegou antes do desenho. Ele fica de fora do corte em vez de virar uma
  // peça invisível e inalcançável.
  return resultado.data.filter((hotspot) => hotspot.key in SHAPE_BY_KEY);
}

export default function RocketAnatomyModule({ spec }: ModuleComponentProps) {
  const hotspots = useMemo(() => lerHotspots(spec), [spec]);
  const [selecionado, setSelecionado] = useState(() => hotspots[0]?.key ?? "");

  const atual = hotspots.find((hotspot) => hotspot.key === selecionado) ?? hotspots[0];

  if (!atual) {
    return (
      <Panel className="px-6 py-10 text-center">
        <p className="text-sm text-[var(--color-neutral-500)]">
          Este módulo ainda não tem sistemas descritos.
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <Panel className="overflow-hidden">
          <div className="grid-paper aspect-[3/4] w-full px-4 py-3">
            <RocketCutaway
              parts={hotspots}
              selected={atual.key}
              onSelect={setSelecionado}
            />
          </div>
        </Panel>

        <p className="text-xs leading-relaxed text-[var(--color-neutral-500)]">
          Selecione um sistema no corte, ou percorra com as setas do teclado.
          O esquema é conceitual: proporções e disposição servem à leitura, não a
          um veículo específico.
        </p>
      </div>

      <div className="flex flex-col gap-5">
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
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Índice dos sistemas" />

          {/* Duplica o alvo do desenho de propósito. No toque as peças menores
              — canais de refrigeração, atuadores — são difíceis de acertar, e
              esta lista é o caminho que não depende de mira. */}
          <ul className="flex flex-wrap gap-1.5 px-5 py-4">
            {hotspots.map((hotspot) => {
              const ativo = hotspot.key === atual.key;

              return (
                <li key={hotspot.key}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(hotspot.key)}
                    aria-pressed={ativo}
                    className={
                      ativo
                        ? "rounded-full border border-[var(--color-accent)] px-2.5 py-1 text-xs text-[var(--color-accent-300)]"
                        : "rounded-full border border-[var(--color-line)] px-2.5 py-1 text-xs text-[var(--color-neutral-400)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                    }
                  >
                    {hotspot.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
