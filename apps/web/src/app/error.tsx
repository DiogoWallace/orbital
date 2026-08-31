"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandBar } from "@/components/layout/BrandBar";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

/**
 * Render que quebrou fora da plataforma — landing, telas de conta, ou qualquer
 * segmento sem `error.tsx` próprio.
 *
 * Traz a própria moldura porque, ao contrário do `(platform)/error.tsx`, não
 * há layout de grupo em volta: um `error.tsx` cobre o que está abaixo dele, e
 * o layout do mesmo nível não conta. Aqui, o nível de cima é só o `<html>` e o
 * `<body>` da raiz.
 */
export default function RootError({
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
    <div className="flex min-h-dvh flex-col">
      <BrandBar />

      <main className="flex-1">
        <ErrorScreen
          codigo="500"
          kicker="Falha no nosso lado"
          titulo="Alguma coisa quebrou ao montar esta página."
          acoes={
            <>
              <button
                type="button"
                onClick={() => retry()}
                className="btn btn-primary px-4.5 py-2.5 text-[15px]"
              >
                Tentar de novo
              </button>
              <Link href="/" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
                Voltar ao início
              </Link>
            </>
          }
          detalhe={
            error.digest ? (
              <>
                Se acontecer de novo, este código identifica a falha no nosso log:{" "}
                <span className="tabular text-[var(--color-neutral-400)]">
                  {error.digest}
                </span>
              </>
            ) : null
          }
        >
          <p>
            O erro é nosso, não seu. Costuma ser momentâneo — vale tentar de novo
            antes de qualquer outra coisa.
          </p>
        </ErrorScreen>
      </main>
    </div>
  );
}
