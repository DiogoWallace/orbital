import { corpoDe, encaminhar } from "@/lib/api/proxy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await corpoDe(request);

  if (!body) {
    return Response.json({ message: "Requisição inválida." }, { status: 400 });
  }

  return encaminhar(`/comments/${id}`, {
    method: "PATCH",
    body,
    erroPadrao: "Não foi possível salvar a edição.",
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return encaminhar(`/comments/${id}`, {
    method: "DELETE",
    erroPadrao: "Não foi possível apagar o comentário.",
  });
}
