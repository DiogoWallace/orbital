import { Panel } from "@/components/ui/Panel";
import { loadModule } from "@/modules/registry";
import { parseModuleSpec } from "@/modules/types";
import type { ScienceModule } from "@/lib/api/types";

/**
 * Ponte entre a linha do banco e o componente React (ADR 0005).
 *
 * O `import()` do registry é resolvido aqui, no servidor, e o resultado é um
 * chunk separado: quem abre um módulo de química não baixa o bundle do
 * laboratório orbital.
 *
 * Chave ausente ou desconhecida não é erro — é o estado normal de um módulo
 * cujo conteúdo já existe e cuja experiência ainda está sendo construída.
 */
export async function ModuleRenderer({ module }: { module: ScienceModule }) {
  if (!module.componentKey) {
    return null;
  }

  const definition = await loadModule(module.componentKey);

  if (!definition) {
    return <ModuleUnavailable componentKey={module.componentKey} />;
  }

  const spec = parseModuleSpec(module.spec);
  const { Component } = definition;

  return <Component module={module} spec={spec} />;
}

function ModuleUnavailable({ componentKey }: { componentKey: string }) {
  return (
    <Panel className="px-6 py-10 text-center">
      <p className="text-sm text-[var(--color-ink-muted)]">
        A experiência interativa deste módulo ainda não foi publicada.
      </p>
      <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
        O conteúdo abaixo já está disponível para leitura.
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <p className="tabular mt-4 text-[11px] text-[var(--color-ink-faint)]">
          componente <code>{componentKey}</code> não registrado em
          <code> src/modules/registry.ts</code>
        </p>
      ) : null}
    </Panel>
  );
}
