import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { startSession } from "@/lib/auth/session";
import type { Envelope, User } from "@/lib/api/types";

/**
 * BFF de login.
 *
 * O navegador fala com esta rota; ela fala com o Laravel. O token da resposta
 * nunca volta para o cliente — ele vira cookie httpOnly aqui (ADR 0004).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<Envelope<{ user: User; token: string }>>("/auth/login", {
      method: "POST",
      body,
      authenticated: false,
      cache: "no-store",
    });

    await startSession(data.token);

    return NextResponse.json({ user: data.user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.problem?.detail ?? "Não foi possível entrar.", errors: error.fieldErrors },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
