import Image from "next/image";
import Link from "next/link";
import { heroWebb } from "@/lib/webb";

/**
 * Leituras do painel de abertura.
 *
 * Valores fixos, e de propósito: é uma vitrine da forma do painel, não uma
 * simulação rodando. Ligar isto ao módulo real custaria hidratar o canvas
 * inteiro acima da dobra para animar quatro números que ninguém veio ler — e a
 * primeira coisa que a landing precisa fazer é aparecer.
 *
 * Os números são de uma órbita de transferência plausível, coerentes entre si:
 * com periapsis a 400 km e apoapsis a 18 420 km, a excentricidade dá ~0,573.
 */
const leituras = [
  { rotulo: "Apoapsis", valor: "18 420", unidade: "km" },
  { rotulo: "Periapsis", valor: "400", unidade: "km" },
  { rotulo: "Excentricidade", valor: "0,573", unidade: "" },
  { rotulo: "Período", valor: "312,4", unidade: "min" },
];

/**
 * Abertura da landing.
 *
 * A imagem é o argumento, mas o texto é o que precisa ser lido: por isso ela
 * entra escurecida por dois gradientes — um vertical, que apaga a base para o
 * fundo da página, e um lateral, que abre espaço legível à esquerda sem cortar
 * o lado direito da foto. Um só gradiente na diagonal escureceria o céu de
 * forma desigual e deixaria trechos de texto sem contraste.
 *
 * `priority` só aqui: esta é a maior imagem acima da dobra, e a única que vale
 * tirar da fila de carregamento preguiçoso.
 */
export function WebbHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src={heroWebb.imagem}
          alt=""
          placeholder="blur"
          priority
          sizes="100vw"
          className="size-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-bg)_6%,color-mix(in_srgb,var(--color-bg)_72%,transparent)_55%,color-mix(in_srgb,var(--color-bg)_35%,transparent))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-bg)_8%,color-mix(in_srgb,var(--color-bg)_74%,transparent)_52%,transparent)]" />
      </div>

      <div className="mx-auto grid max-w-[1240px] items-end gap-14 px-7 pt-[108px] pb-22 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.14em] text-[var(--color-accent-300)] uppercase">
            <span aria-hidden className="block h-0.5 w-[22px] bg-[var(--color-accent)]" />
            Laboratório aberto
          </p>

          <h1 className="mt-4.5 max-w-[15ch] text-[40px] leading-[1.04] tracking-[-0.025em] text-balance sm:text-[54px]">
            Ciência que responde quando você mexe.
          </h1>

          <p className="mt-5.5 max-w-[52ch] text-[17px] leading-relaxed text-[var(--color-neutral-300)]">
            Simulações que rodam no seu navegador, um feed com o que há de mais
            recente em pesquisa, e um caminho curto entre os dois: rode o
            experimento, salve o cenário, publique o resultado.
          </p>

          <div className="mt-7.5 flex flex-wrap gap-2.5">
            <Link href="/explorar" className="btn btn-primary px-4.5 py-2.5 text-[15px]">
              Abrir o laboratório
            </Link>
            <Link href="/blog" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
              Ler o feed
            </Link>
          </div>

          {/* O crédito acompanha a imagem, como manda a licença CC BY 4.0 — e de
              quebra informa o que se está vendo, que numa plataforma científica
              é parte do conteúdo, não nota de rodapé. */}
          <p className="mt-11 max-w-[44ch] text-[11px] leading-relaxed text-[var(--color-neutral-500)]">
            Acima: {heroWebb.titulo} · {heroWebb.dados[2]?.valor} ·{" "}
            {heroWebb.dados[3]?.valor} · {heroWebb.credito} ·{" "}
            <a
              href={heroWebb.fonte}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-neutral-400)] underline underline-offset-2 hover:text-[var(--color-accent)]"
            >
              ESA/Webb
            </a>
          </p>
        </div>

        {/* O painel do módulo aparece já na abertura porque ele é o produto. Um
            print da simulação diria a mesma coisa e envelheceria sozinho; a
            peça de interface de verdade envelhece junto com o resto. */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] shadow-[var(--shadow-md)] backdrop-blur-[8px]">
          <div className="rule-bottom flex items-center justify-between px-4 py-3">
            <span className="text-[11px] tracking-[0.1em] text-[var(--color-neutral-400)] uppercase">
              Laboratório orbital
            </span>
            <span className="tag tag-accent">rodando</span>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-x-4.5 gap-y-3.5">
              {leituras.map((leitura) => (
                <div key={leitura.rotulo}>
                  <div className="text-[10px] tracking-[0.1em] text-[var(--color-neutral-500)] uppercase">
                    {leitura.rotulo}
                  </div>
                  <div className="num mt-1 text-[21px] font-medium tracking-[-0.02em]">
                    {leitura.valor}
                    {leitura.unidade ? (
                      <span className="ml-1 text-[11px] text-[var(--color-neutral-500)]">
                        {leitura.unidade}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4.5">
              <div className="flex items-baseline justify-between text-[11px] text-[var(--color-neutral-400)]">
                <span>Velocidade inicial</span>
                <span className="num">1,28 × circular</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-[var(--color-neutral-800)]">
                <div className="h-full w-[62%] rounded-full bg-[var(--color-accent)]" />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-neutral-500)]">
                Acima de 1,414 a trajetória deixa de retornar. O painel do módulo
                é o mesmo em todas as áreas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
