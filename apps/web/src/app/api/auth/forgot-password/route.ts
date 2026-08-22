import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";

/**
 * Pedido de recuperação de senha.
 *
 * Repassa a resposta da API sem interpretar: ela é sempre a mesma frase, para
 * qualquer endereço. Se o BFF tentasse enriquecer ("não achamos essa conta"),
 * desfaria justamente a propriedade que o endpoint da API foi desenhado para
 * ter — não dizer quem tem cadastro.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<Envelope<{ message: string }>>("/auth/forgot-password", {
      method: "POST",
      body,
      authenticated: false,
      cache: "no-store",
    });

    return NextResponse.json({ message: data.message });
  } catch (error) {
    if (error instanceof ApiError) {
      // 429 chega aqui quando alguém insiste. A mensagem do throttle é útil e
      // não vaza nada: ela fala do pedido, não da existência da conta.
      return NextResponse.json(
        {
          message:
            error.status === 429
              ? "Muitos pedidos seguidos. Espere alguns minutos e tente de novo."
              : (error.problem?.detail ?? "Não foi possível enviar o e-mail."),
          errors: error.fieldErrors,
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
