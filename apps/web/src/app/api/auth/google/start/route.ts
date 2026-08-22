import { NextResponse } from "next/server";

/**
 * Porta de entrada do login com o Google.
 *
 * Existe para que o HTML da página aponte só para a nossa origem. O endereço
 * público da API (`API_PUBLIC_URL`) fica no servidor; em produção API e site
 * dividem o domínio, em desenvolvimento são portas diferentes, e a página não
 * precisa saber de nada disso.
 *
 * O redirect é 302, e não 307: o navegador precisa fazer um GET simples aqui.
 */
export async function GET() {
  const api = process.env.API_PUBLIC_URL;

  if (!api) {
    return NextResponse.redirect(new URL("/login?erro=indisponivel", process.env.NEXT_PUBLIC_SITE_URL));
  }

  return NextResponse.redirect(`${api}/api/v1/auth/google/redirect`, 302);
}
