import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";

/**
 * Troca efetiva da senha.
 *
 * Não abre sessão ao final, de propósito: a API também não devolve token aqui.
 * Quem tem o link do e-mail prova controle da caixa, não conhecimento da senha
 * nova — e o link circula por um canal que não controlamos.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<Envelope<{ message: string }>>("/auth/reset-password", {
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
          message: error.problem?.detail ?? "Não foi possível alterar a senha.",
          errors: error.fieldErrors,
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
