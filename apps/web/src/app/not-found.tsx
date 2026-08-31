import Link from "next/link";
import { BrandBar } from "@/components/layout/BrandBar";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

/**
 * 404 de endereço que não existe em rota nenhuma.
 *
 * Este arquivo pega dois casos: o `notFound()` disparado por um segmento sem
 * `not-found.tsx` próprio, e — o mais comum — qualquer URL que não casa com
 * rota alguma. Como ele renderiza dentro do layout raiz, que é só `<html>` e
 * `<body>`, a moldura vem daqui.
 *
 * De propósito sem `SiteHeader`: ele lê a sessão, e ler a sessão é ir à API.
 * Um 404 é a página que mais recebe robô e link velho no site inteiro, e não
 * há motivo para cada uma dessas visitas custar uma consulta.
 *
 * A busca não é enfeite. Quem cai num link quebrado quase sempre sabe o que
 * queria; oferecer o campo aqui é mais curto do que mandar a pessoa de volta
 * para a home procurar sozinha.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar />

      <main className="flex-1">
        <ErrorScreen
          codigo="404"
          kicker="Endereço sem resposta"
          titulo="Não existe nada neste endereço."
          acoes={
            <>
              <Link href="/" className="btn btn-primary px-4.5 py-2.5 text-[15px]">
                Voltar ao início
              </Link>
              <Link href="/blog" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
                Ir para o feed
              </Link>
            </>
          }
          detalhe={
            <>
              Se você chegou por um link nosso, ele está errado e vale avisar. Se
              digitou, confira se sobrou alguma coisa no fim do endereço.
            </>
          }
        >
          <p>
            O link pode ter mudado de lugar, ou o conteúdo pode ter saído do ar.
            Se você sabe o que procurava, a busca do catálogo é o caminho mais
            curto.
          </p>

          <form action="/explorar" className="relative mt-5 flex items-center">
            <svg
              aria-hidden
              viewBox="0 0 256 256"
              width="15"
              height="15"
              fill="currentColor"
              className="absolute left-[11px] text-[var(--color-neutral-500)]"
            >
              <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
            </svg>
            <input
              className="input py-2.5 pl-9"
              type="search"
              name="busca"
              aria-label="Buscar no catálogo"
              placeholder="Buscar módulos, notas, autores"
            />
          </form>
        </ErrorScreen>
      </main>
    </div>
  );
}
