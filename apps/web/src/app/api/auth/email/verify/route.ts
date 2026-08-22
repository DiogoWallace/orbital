import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";

/**
 * Confirmação do e-mail.
 *
 * Não exige sessão, como o endpoint da API: o link costuma ser aberto no
 * celular ou em outro navegador, onde o cookie não existe.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<Envelope<{ message: string }>>("/auth/email/verify", {
      method: "POST",
      body,
      authenticated: false,
      cache: "no-store",
    });

    return NextResponse.json({ message: data.message });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          message:
            error.fieldErrors.token?.[0] ??
            error.problem?.detail ??
            "Não foi possível confirmar o e-mail.",
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
