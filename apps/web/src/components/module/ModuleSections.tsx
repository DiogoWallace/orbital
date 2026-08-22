import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Panel } from "@/components/ui/Panel";
import type { ModuleSection } from "@/lib/api/types";

/**
 * Conteúdo textual do módulo.
 *
 * Blocos tipados, e não um HTML único, porque cada tipo tem semântica própria:
 * fórmula vai para o KaTeX, destaque ganha estilo e papel de aviso, referência
 * é citação. Um campo de HTML livre também exigiria sanitização — aqui a
 * entrada é Markdown, e o pipeline não gera HTML arbitrário.
 */
export function ModuleSections({ sections }: { sections: ModuleSection[] }) {
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.anchor ?? undefined}
          className="scroll-mt-20"
        >
          {section.kind === "callout" ? (
            <CalloutSection section={section} />
          ) : (
            <>
              {section.title ? (
                <h2 className="text-lg font-medium tracking-tight text-[var(--color-ink)]">
                  {section.title}
                </h2>
              ) : null}
              <Prose>{bodyFor(section)}</Prose>
              {section.kind === "formula" ? (
                <Caption meta={section.meta} />
              ) : null}
            </>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * Um bloco `formula` guarda LaTeX puro, sem delimitadores.
 *
 * Quem escreve o conteúdo já declarou o tipo do bloco; exigir que também
 * envolvesse tudo em `$$` seria pedir a mesma informação duas vezes — e a
 * segunda é a que se esquece.
 */
function bodyFor(section: ModuleSection): string {
  const body = section.body ?? "";

  if (section.kind !== "formula" || body.includes("$$")) {
    return body;
  }

  return `$$\n${body.trim()}\n$$`;
}

function CalloutSection({ section }: { section: ModuleSection }) {
  const tone = typeof section.meta?.tone === "string" ? section.meta.tone : "info";

  const border =
    tone === "warning"
      ? "border-l-[var(--color-signal-warn)]"
      : "border-l-[var(--accent)]";

  return (
    <Panel className={`border-l-2 px-5 py-4 ${border}`}>
      {section.title ? (
        <h3 className="text-sm font-medium text-[var(--color-ink)]">
          {section.title}
        </h3>
      ) : null}
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {section.body}
      </p>
    </Panel>
  );
}

function Caption({ meta }: { meta: Record<string, unknown> }) {
  const caption = typeof meta?.caption === "string" ? meta.caption : null;

  if (!caption) return null;

  return (
    <p className="mt-2 text-xs text-[var(--color-ink-faint)]">{caption}</p>
  );
}

function Prose({ children }: { children: string }) {
  return (
    <div className="mt-3 space-y-4 text-sm leading-relaxed text-[var(--color-ink-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_code]:font-[family-name:var(--font-mono)] [&_strong]:text-[var(--color-ink)]">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </Markdown>
    </div>
  );
}
