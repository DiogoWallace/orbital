import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api/client";

/**
 * Guarda do token de sessão (ADR 0004).
 *
 * O token vive apenas em cookie httpOnly, escrito e lido aqui. O JavaScript da
 * página nunca o vê, e por isso um XSS não consegue roubá-lo.
 */

/** Sete dias, o mesmo horizonte de `SANCTUM_TOKEN_EXPIRATION` na API. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function startSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // `lax` e não `strict`: com `strict` o usuário que chega por um link
    // externo aterrissa deslogado, mesmo tendo sessão válida.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function hasSession(): Promise<boolean> {
  return (await cookies()).has(SESSION_COOKIE);
}
