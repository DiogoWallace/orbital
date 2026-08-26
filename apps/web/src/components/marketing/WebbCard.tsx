import Image from "next/image";
import type { WebbImage } from "@/lib/webb";

/**
 * Uma imagem do Webb na galeria da landing.
 *
 * Virou figura seca — foto e uma linha de legenda — no lugar do cartão com
 * painel de dados que existia antes. Três desses painéis lado a lado somavam
 * quinze pares rótulo/valor numa seção cujo argumento é "olhe a imagem"; a
 * ficha técnica competia com a coisa que ela descrevia. Os dados completos
 * pertencem à página do objeto, não à vitrine.
 *
 * `mix-blend-mode: lighten` na imagem: o preto do céu vira o fundo da página em
 * vez de um retângulo mais claro dentro dela, e some a borda da foto. Só
 * funciona porque o fundo do contêiner é mais escuro que o fundo da página.
 *
 * O crédito fica na legenda, com link ativo, porque a licença CC BY 4.0 da ESA
 * exige crédito legível junto do conteúdo — não escondido no rodapé.
 */
export function WebbCard({ imagem }: { imagem: WebbImage }) {
  const objeto = imagem.dados.find((dado) => dado.rotulo === "Objeto");
  const distancia = imagem.dados.find((dado) => dado.rotulo === "Distância");

  return (
    <figure>
      <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[#0f111a]">
        <Image
          src={imagem.imagem}
          alt={imagem.alt}
          placeholder="blur"
          // Três colunas no desktop, uma no celular: sem isto o Next serve a
          // variante de tela cheia para um cartão de um terço de largura.
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="lighten size-full object-cover"
        />
      </div>

      <figcaption className="mt-2.5 text-xs text-[var(--color-neutral-400)]">
        <span className="text-[var(--color-text)]">{imagem.titulo}</span>
        {objeto ? (
          <>
            {" · "}
            <span className="num">{objeto.valor}</span>
          </>
        ) : null}
        {distancia ? (
          <>
            {" · "}
            <span className="num">{distancia.valor}</span>
          </>
        ) : null}
        {" · "}
        {imagem.credito} ·{" "}
        <a
          href={imagem.fonte}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-neutral-500)] underline underline-offset-2 hover:text-[var(--color-accent)]"
        >
          ESA/Webb
        </a>
      </figcaption>
    </figure>
  );
}
