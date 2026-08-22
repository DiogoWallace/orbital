import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  // Revoga do lado da API e limpa o cookie aqui. Se a API falhar, o cookie
  // some do mesmo jeito: para o usuário, sair precisa sempre funcionar.
  try {
    await apiFetch<void>("/auth/logout", { method: "POST", cache: "no-store" });
  } catch {
    // Silenciado de propósito — ver comentário acima.
  }

  await endSession();

  return NextResponse.json({ ok: true });
}
