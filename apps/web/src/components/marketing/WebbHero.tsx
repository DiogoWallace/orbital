import Image from "next/image";
import Link from "next/link";
import { heroWebb } from "@/lib/webb";

/**
 * Abertura da landing.
 *
 * A imagem é o argumento, mas o texto é o que precisa ser lido: por isso ela
 * entra escurecida por dois gradientes — um vertical, que apaga a base para o
 * fundo da página, e um lateral, que abre espaço legível à esquerda sem cortar
 * o lado direito da foto.
 *
 * `priority` só aqui: esta é a maior imagem acima da dobra, e a única que vale
 * tirar da fila de carregamento preguiçoso. As outras cinco continuam
 * carregando sob demanda.
 */
export function WebbHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--color-line)]">
      <div className="absolute inset-0 -z-10">
        <Image
          src={heroWebb.imagem}
          alt={heroWebb.alt}
          placeholder="blur"
          priority
          sizes="100vw"
          className="size-full object-cover"
        />
        {/* Gradientes em elementos separados: um só, na diagonal, escureceria o
            céu de forma desigual e deixaria trechos de texto sem contraste. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[var(--color-void)] via-[var(--color-void)]/70 to-[var(--color-void)]/30"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[var(--color-void)] via-[var(--color-void)]/60 to-transparent"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-28 sm:py-36">
        <p className="text-xs tracking-[0.2em] text-[var(--accent)] uppercase">
          Laboratório digital
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Conceitos complexos deixam de ser abstratos quando você pode mexer neles.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-muted)]">
          Orbital reúne simulações interativas, visualizações e análise de dados em
          física, astronomia, engenharia e química. Cada módulo é um experimento que
          roda no seu navegador — ajuste as variáveis e veja o resultado no mesmo
          quadro.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/explorar"
            className="rounded-[var(--radius-control)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-void)] transition-[filter] hover:brightness-110"
          >
            Explorar módulos
          </Link>
          <Link
            href="/modulos/orbital-sandbox"
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[color-mix(in_oklch,var(--color-void)_60%,transparent)] px-5 py-2.5 text-sm backdrop-blur transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Ver uma simulação
          </Link>
        </div>

        {/* O crédito acompanha a imagem, como manda a licença CC BY 4.0 — e de
            quebra informa o que se está vendo, que numa plataforma científica
            é parte do conteúdo, não nota de rodapé. */}
        <p className="mt-16 max-w-md text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          Acima: {heroWebb.titulo} · {heroWebb.dados[2]?.valor} ·{" "}
          {heroWebb.dados[3]?.valor} · {heroWebb.credito} ·{" "}
          <a
            href={heroWebb.fonte}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[var(--accent)]"
          >
            ESA/Webb
          </a>
        </p>
      </div>
    </section>
  );
}
