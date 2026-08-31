import Link from "next/link";

/**
 * A barra de marca, sozinha.
 *
 * O `SiteHeader` completo lê a sessão, e ler a sessão é falar com a API. Nas
 * telas de erro isso é exatamente o que não se pode fazer: metade delas existe
 * porque a API não respondeu, e um cabeçalho que depende dela transformaria a
 * página de erro em outro erro. Aqui só há uma marca e um caminho de volta —
 * nada que possa falhar.
 */
export function BrandBar() {
  return (
    <div className="shadow-[0_1px_0_var(--color-divider)]">
      <div className="mx-auto flex h-[58px] max-w-[1240px] items-center px-7">
        <Link href="/" className="flex items-baseline gap-2">
          <span
            aria-hidden
            className="block size-[7px] rounded-full bg-[var(--color-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]"
          />
          <span className="text-[17px] font-medium tracking-[-0.02em]">Orbital</span>
        </Link>
      </div>
    </div>
  );
}
