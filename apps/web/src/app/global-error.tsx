"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * O último anteparo: o layout raiz quebrou.
 *
 * Este arquivo substitui o layout raiz inteiro quando entra em cena, então
 * precisa trazer as próprias tags `<html>` e `<body>` — não há nada acima dele.
 * Pelo mesmo motivo ele importa o `globals.css` diretamente: as folhas de
 * estilo que o layout raiz traria não vêm junto, porque o layout raiz é
 * justamente o que não renderizou.
 *
 * A fonte também some por aí. O `next/font` pendura `--font-inter` como classe
 * no `<html>` do layout raiz; sem ele, a variável não existe. Os tokens já
 * declaram um fallback para esse caso, e a `lang` fica no `<html>` daqui para
 * que o leitor de tela não leia o português com pronúncia de inglês.
 *
 * Nada de componente compartilhado nesta tela, e é deliberado: se o layout
 * raiz caiu, qualquer import a mais é mais uma chance de o anteparo cair
 * junto. Marcação e estilo inline, e só.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          background: "var(--color-bg, #161826)",
          color: "var(--color-text, #e9e9ed)",
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "28px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "620px" }}>
          <p
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent-300, #d2cefd)",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "block",
                width: "22px",
                height: "2px",
                background: "var(--color-accent, #9184d9)",
              }}
            />
            Falha geral
          </p>

          <p
            aria-hidden
            style={{
              margin: "20px 0 0",
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              fontVariantNumeric: "tabular-nums",
              fontSize: "72px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "var(--color-neutral-700, #595d6c)",
            }}
          >
            500
          </p>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "30px",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.12,
            }}
          >
            O Orbital não conseguiu se montar.
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              fontSize: "15px",
              lineHeight: 1.6,
              color: "var(--color-neutral-400, #b2b6ca)",
            }}
          >
            A falha foi antes de qualquer página existir, então não há muito a
            fazer daqui além de tentar de novo. Se insistir, é problema nosso e
            já estamos vendo.
          </p>

          <div style={{ margin: "28px 0 0", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button type="button" onClick={() => retry()} className="btn btn-primary">
              Tentar de novo
            </button>
            {/* Âncora comum, e não `<Link>`: navegação do lado do cliente
                remontaria a mesma árvore que acabou de quebrar, e o layout
                raiz continuaria caído. Uma carga de página inteira é o que dá
                à aplicação a chance de subir de novo do zero — por isso a
                regra do lint está desligada só aqui. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn btn-secondary">
              Voltar ao início
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                margin: "40px 0 0",
                paddingTop: "16px",
                borderTop: "1px solid var(--color-divider, rgba(233,233,237,0.16))",
                fontSize: "11px",
                lineHeight: 1.6,
                color: "var(--color-neutral-600, #75798c)",
              }}
            >
              Código da falha no nosso log:{" "}
              <span
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  color: "var(--color-neutral-400, #b2b6ca)",
                }}
              >
                {error.digest}
              </span>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
