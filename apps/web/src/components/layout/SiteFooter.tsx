import Link from "next/link";

/**
 * Rodapé.
 *
 * As colunas repetem a navegação do topo em vez de inventar um mapa do site
 * paralelo: o rodapé de um produto pequeno serve para dizer "acabou aqui, e é
 * por ali que se continua", não para listar tudo que existe.
 *
 * Todo destino aqui é uma rota que responde. As seções editoriais previstas no
 * desenho — roadmap, curadoria, contato — ainda não têm página, e apontá-las
 * para `#` daria quatro links mortos no lugar mais visitado por quem está
 * perdido. Entram quando existirem.
 */
const colunas = [
  {
    titulo: "Plataforma",
    itens: [
      { label: "Laboratório", href: "/explorar" },
      { label: "Áreas", href: "/#areas" },
      { label: "Projetos", href: "/projetos" },
      { label: "Painel", href: "/dashboard" },
    ],
  },
  {
    titulo: "Feed",
    itens: [
      { label: "Tudo", href: "/blog" },
      { label: "Notícias", href: "/blog?tag=noticias" },
      { label: "Pesquisa", href: "/blog?tag=pesquisa" },
      { label: "Bastidores", href: "/blog?tag=bastidores" },
    ],
  },
  {
    titulo: "Sobre",
    itens: [
      { label: "O projeto", href: "/#o-projeto" },
      { label: "O céu como dado", href: "/#ceu" },
      { label: "Licenças", href: "/#licencas" },
      { label: "Entrar", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="rule-top mt-20">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-7 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="block size-[7px] rounded-full bg-[var(--color-accent)]"
            />
            <span className="text-[17px] font-medium tracking-[-0.02em]">Orbital</span>
          </Link>
          <p className="mt-3 max-w-[40ch] text-[12.5px] leading-relaxed text-[var(--color-neutral-500)]">
            Plataforma científica interativa. Os modelos são simplificações
            didáticas, honestas sobre o que simplificam — não ferramentas de
            engenharia.
          </p>
        </div>

        {colunas.map((coluna) => (
          <div key={coluna.titulo}>
            <h6 className="mb-3 text-[var(--color-neutral-500)]">{coluna.titulo}</h6>
            <div className="flex flex-col gap-2.5 text-[13px]">
              {coluna.itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[var(--color-neutral-400)] transition-colors hover:text-[var(--color-accent)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 px-7 pb-10 text-[11.5px] text-[var(--color-neutral-600)]">
        <span>Imagens da ESA/Webb sob CC BY 4.0. Não afiliado à ESA, NASA ou CSA.</span>
        <span className="num">v0.1.0</span>
      </div>
    </footer>
  );
}
