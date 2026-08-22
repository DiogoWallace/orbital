export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--color-line)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-[var(--color-ink-faint)]">
        <p>
          Orbital — plataforma científica interativa. Os modelos são
          simplificações didáticas, não ferramentas de engenharia.
        </p>
        <p className="tabular">v0.1.0</p>
      </div>
    </footer>
  );
}
