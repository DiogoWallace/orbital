import Link from "next/link";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

/**
 * 404 de conteúdo que não existe — módulo, projeto, área, nota ou perfil.
 *
 * Separado do 404 da raiz porque a casca é outra: aqui a pessoa já está dentro
 * da plataforma, com cabeçalho e rodapé em volta vindos do layout do grupo, e
 * a conversa muda. Não é "este endereço não existe"; é "este item saiu do
 * catálogo, e o catálogo continua ali".
 *
 * É o que responde ao `notFound()` de `/modulos/[slug]`, `/projetos/[slug]`,
 * `/disciplinas/[slug]`, `/blog/[slug]` e `/perfil/[username]` — inclusive
 * quando a API devolve 404 de propósito, como faz com o rascunho de outra
 * pessoa. Deste lado não dá para saber a diferença entre "não existe" e "não é
 * seu", e é assim que tem que ser: distinguir os dois entregaria a existência
 * do rascunho.
 */
export default function NotFound() {
  return (
    <ErrorScreen
      className="px-0 py-12 sm:py-16"
      codigo="404"
      kicker="Fora do catálogo"
      titulo="Este conteúdo não está aqui."
      acoes={
        <>
          <Link href="/explorar" className="btn btn-primary px-4.5 py-2.5 text-[15px]">
            Ver o catálogo
          </Link>
          <Link href="/blog" className="btn btn-secondary px-4.5 py-2.5 text-[15px]">
            Ir para o feed
          </Link>
        </>
      }
      detalhe="Rascunhos e itens despublicados respondem assim para quem não é o autor — se é seu e você está logado, confira se a sessão não expirou."
    >
      <p>
        Ou o item nunca existiu, ou saiu do ar. Acontece com nota despublicada,
        módulo arquivado e link antigo que mudou de endereço.
      </p>
    </ErrorScreen>
  );
}
