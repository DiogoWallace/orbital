import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";

/**
 * Reenvio da confirmação.
 *
 * Autenticado: o destino vem do token da sessão, nunca do corpo. Sem isso o
 * endpoint viraria uma forma de mandar e-mail para terceiros com o nosso
 * domínio no remetente.
 */
export async function POST() {
  try {
    const { data } = await apiFetch<Envelope<{ message: string }>>(
      "/auth/email/verification-notification",
      { method: "POST", cache: "no-store" },
    );

    return NextResponse.json({ message: data.message });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          message:
            error.status === 429
              ? "Você já pediu alguns links faz pouco. Espere alguns minutos."
              : (error.problem?.detail ?? "Não foi possível reenviar o e-mail."),
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
