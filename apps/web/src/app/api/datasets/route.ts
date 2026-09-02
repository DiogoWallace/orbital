import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { Dataset, Paginated } from "@/lib/api/types";

/**
 * Lista as séries observacionais disponíveis.
 *
 * Leitura pelo BFF, e não Server Component, porque quem precisa da lista é um
 * componente cliente — o seletor de alvos do módulo, que troca de alvo sem
 * recarregar a página. O token continua saindo daqui, do servidor: o navegador
 * nunca fala com o Laravel (ADR 0004).
 *
 * Sem a série junto. Esta rota devolve metadados e procedência; os pontos saem
 * pela rota de série, quando alguém escolhe um alvo.
 */
export async function GET() {
  try {
    const dados = await apiFetch<Paginated<Dataset>>("/datasets?perPage=50", {
      cache: "no-store",
    });

    return NextResponse.json(dados);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.problem?.detail ?? "Não foi possível listar as séries." },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
