import { corpoDe, encaminhar } from "@/lib/api/proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await corpoDe(request);

  if (!body) {
    return Response.json({ message: "Requisição inválida." }, { status: 400 });
  }

  return encaminhar(`/comments/${id}/report`, {
    method: "POST",
    body,
    erroPadrao: "Não foi possível registrar a denúncia.",
  });
}
