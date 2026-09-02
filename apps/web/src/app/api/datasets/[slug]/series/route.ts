import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { DatasetSeries } from "@/lib/api/types";

/**
 * Os pontos de uma série.
 *
 * Rota separada da listagem de propósito, do mesmo jeito que na API: uma curva
 * de um setor tem dezenas de milhares de pontos, e carregá-la junto da lista
 * faria toda visita pagar por um alvo que talvez nem seja escolhido.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const dados = await apiFetch<{ data: DatasetSeries }>(
      `/datasets/${encodeURIComponent(slug)}/series`,
      { cache: "no-store" },
    );

    return NextResponse.json(dados);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.problem?.detail ?? "Não foi possível carregar a série." },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Serviço indisponível." }, { status: 503 });
  }
}
