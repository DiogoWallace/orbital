import "server-only";

import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "./client";

/**
 * Encaminha uma mutação do navegador para a API.
 *
 * Nasceu na sétima rota de BFF que fazia exatamente a mesma coisa: ler o
 * corpo, repassar com o token do cookie, e traduzir o erro. Copiar isso sete
 * vezes garantiria que a oitava esquecesse o tratamento de 429.
 *
 * O que **não** entra aqui: qualquer rota que mexa na sessão. Login, logout e
 * a troca do ticket do Google continuam explícitos, porque lá o que importa é
 * o cookie httpOnly — e esconder isso atrás de um utilitário genérico é como
 * se perde a única garantia do ADR 0004.
 */
export async function encaminhar<T>(
  path: string,
  options: { method: "POST" | "PATCH" | "DELETE"; body?: unknown; erroPadrao?: string } = {
    method: "POST",
  },
): Promise<NextResponse> {
  const { method, body, erroPadrao = "Não foi possível concluir a ação." } = options;

  try {
    const data = await apiFetch<T>(path, {
      method,
      body,
      cache: "no-store",
    });

    // 204 vira 200 com corpo vazio: o cliente só precisa saber que deu certo,
    // e `NextResponse.json(undefined)` produziria um corpo inválido.
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          message:
            error.status === 429
              ? "Muitas ações seguidas. Espere um pouco."
              : (error.problem?.detail ?? erroPadrao),
          errors: error.fieldErrors,
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}

/** Lê o corpo JSON da requisição, ou `null` se não houver um válido. */
export async function corpoDe(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);

  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}
