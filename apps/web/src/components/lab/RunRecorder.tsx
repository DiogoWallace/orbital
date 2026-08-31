"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ParameterValues } from "@/modules/types";

/**
 * Guarda o cenário corrente como uma execução citável.
 *
 * Isto é núcleo, não módulo: a persistência e o compartilhamento de execuções
 * estão na coluna genérica da arquitetura, ao lado do painel de parâmetros. Um
 * módulo declara o que vale guardar e recebe o resto pronto — o mesmo trato do
 * `ParameterPanel`, que monta os controles a partir do `spec`.
 *
 * O que sobe é o par que torna o resultado reproduzível: os parâmetros e a
 * versão do modelo que os interpretou. O `summary` vai junto por conveniência
 * de leitura — quem abrir a lista depois vê o desfecho sem reabrir a simulação.
 */
export function RunRecorder({
  moduleSlug,
  parameters,
  summary,
  modelVersion,
  disabled = false,
}: {
  moduleSlug: string;
  parameters: ParameterValues;
  /** Os mostradores no instante em que se guarda. */
  summary: Record<string, number>;
  modelVersion: string;
  /** O módulo pode recusar o momento — meio de uma integração, por exemplo. */
  disabled?: boolean;
}) {
  const pathname = usePathname();

  const [label, setLabel] = useState("");
  const [estado, setEstado] = useState<"parado" | "gravando" | "guardado">("parado");
  const [erro, setErro] = useState<string | null>(null);
  /** Só o 401 vira convite para entrar; os demais erros são texto. */
  const [precisaEntrar, setPrecisaEntrar] = useState(false);

  async function guardar() {
    setEstado("gravando");
    setErro(null);
    setPrecisaEntrar(false);

    try {
      const response = await fetch("/api/simulation-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug,
          label: label.trim() || null,
          parameters: sanear(parameters),
          result: { summary: sanear(summary) },
          modelVersion,
        }),
      });

      if (response.ok) {
        setEstado("guardado");
        setLabel("");

        return;
      }

      const payload = await response.json().catch(() => null);

      setPrecisaEntrar(response.status === 401);
      setErro(payload?.message ?? "Não foi possível guardar a execução agora.");
      setEstado("parado");
    } catch {
      setErro("Sem conexão com o servidor.");
      setEstado("parado");
    }
  }

  if (estado === "guardado") {
    return (
      <div className="rule-top flex flex-wrap items-center gap-3 pt-4 text-sm">
        <span className="inline-flex items-center gap-2 text-[var(--color-signal-ok)]">
          <Check size={14} aria-hidden />
          Execução guardada.
        </span>

        <Link href="/dashboard" className="text-[var(--accent)] hover:underline">
          Ver na sua área
        </Link>

        <button
          type="button"
          onClick={() => setEstado("parado")}
          className="ml-auto text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-ink)]"
        >
          Guardar outra
        </button>
      </div>
    );
  }

  return (
    <div className="rule-top flex flex-col gap-2.5 pt-4">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="field min-w-[200px] flex-1">
          <label htmlFor="run-label">Nome do cenário</label>
          <input
            id="run-label"
            name="run-label"
            className="input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            // O limite é o da coluna. Cortar aqui evita a viagem até a API só
            // para receber um erro de validação que já dava para prever.
            maxLength={120}
            placeholder="Opcional — por exemplo, “órbita baixa estável”"
            disabled={estado === "gravando"}
          />
        </div>

        <Button
          onClick={guardar}
          disabled={disabled || estado === "gravando"}
          className="mb-[2px]"
        >
          <Bookmark size={14} aria-hidden />
          {estado === "gravando" ? "Guardando…" : "Guardar execução"}
        </Button>
      </div>

      {erro ? (
        <p role="status" className="text-xs text-[var(--color-signal-danger)]">
          {erro}{" "}
          {precisaEntrar ? (
            <Link
              href={`/login?proximo=${encodeURIComponent(pathname)}`}
              className="text-[var(--accent)] underline"
            >
              Entrar
            </Link>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-[var(--color-neutral-500)]">
          Guarda os parâmetros e a versão do modelo, para você reabrir o mesmo
          cenário depois.
        </p>
      )}
    </div>
  );
}

/**
 * Troca por `null` o que não sobrevive a um JSON.
 *
 * `NaN` e `Infinity` são resultados legítimos de uma simulação que divergiu, e
 * `JSON.stringify` os converte em `null` sem avisar. Fazer isso aqui, de
 * propósito, é a diferença entre guardar um buraco explícito e guardar um
 * número que parece válido do outro lado.
 */
function sanear<T extends Record<string, unknown>>(valores: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(valores).map(([chave, valor]) => [
      chave,
      typeof valor === "number" && !Number.isFinite(valor) ? null : valor,
    ]),
  );
}
