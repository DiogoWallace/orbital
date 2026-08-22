import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { startSession } from "@/lib/auth/session";
import type { Envelope, User } from "@/lib/api/types";

/**
 * Fim do fluxo do Google.
 *
 * A API redireciona para cá com um ticket de uso único; aqui ele vira token e
 * o token vira cookie httpOnly. É o mesmo desenho do login por senha (ADR
 * 0004): o navegador nunca vê o token, só o cookie que ele não consegue ler.
 *
 * Tudo acontece no servidor, sem JavaScript de página no meio — quem clicou no
 * botão do Google volta direto no painel.
 */
export async function GET(request: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const ticket = new URL(request.url).searchParams.get("ticket");

  if (!ticket) {
    return NextResponse.redirect(new URL("/login?erro=incompleto", site));
  }

  try {
    const { data } = await apiFetch<Envelope<{ user: User; token: string }>>("/auth/exchange", {
      method: "POST",
      body: { ticket },
      authenticated: false,
      cache: "no-store",
    });

    await startSession(data.token);

    return NextResponse.redirect(new URL("/dashboard", site));
  } catch {
    // O ticket vale um minuto. Quem volta de um Google lento, ou recarrega
    // esta URL, cai aqui — e precisa de um caminho, não de um erro.
    return NextResponse.redirect(new URL("/login?erro=expirado", site));
  }
}
