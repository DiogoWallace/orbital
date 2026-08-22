import Image from "next/image";
import type { WebbImage } from "@/lib/webb";

/**
 * Uma imagem do Webb apresentada como leitura de instrumento.
 *
 * A estética da plataforma é laboratório, não ficção científica: a foto entra
 * acompanhada dos números que a produziram — objeto, constelação, distância,
 * instrumento, data. É a mesma disciplina do resto da interface, onde o dado é
 * o protagonista e o enfeite não existe.
 *
 * O crédito fica dentro do cartão, com link ativo, porque a licença CC BY 4.0
 * da ESA exige crédito legível junto do conteúdo — não escondido no rodapé.
 */
export function WebbCard({ imagem }: { imagem: WebbImage }) {
  return (
    <figure className="group overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-void)]">
        <Image
          src={imagem.imagem}
          alt={imagem.alt}
          placeholder="blur"
          // Duas colunas no desktop, uma no celular: sem isto o Next serve a
          // variante de tela cheia para um cartão de meia largura.
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out-instrument)] group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      </div>

      <figcaption className="p-5">
        <h3 className="text-base font-medium tracking-tight">{imagem.titulo}</h3>

        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {imagem.legenda}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--color-line)] pt-4">
          {imagem.dados.map((dado) => (
            <div key={dado.rotulo}>
              <dt className="text-[10px] tracking-widest text-[var(--color-ink-faint)] uppercase">
                {dado.rotulo}
              </dt>
              <dd className="tabular mt-0.5 text-xs text-[var(--color-ink)]">{dado.valor}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          {imagem.credito} ·{" "}
          <a
            href={imagem.fonte}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[var(--accent)]"
          >
            ESA/Webb
          </a>
        </p>
      </figcaption>
    </figure>
  );
}
