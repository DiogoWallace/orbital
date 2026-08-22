import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { startSession } from "@/lib/auth/session";
import type { Envelope, User } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<Envelope<{ user: User; token: string }>>("/auth/register", {
      method: "POST",
      body,
      authenticated: false,
      cache: "no-store",
    });

    await startSession(data.token);

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.problem?.detail ?? "Não foi possível criar a conta.", errors: error.fieldErrors },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
