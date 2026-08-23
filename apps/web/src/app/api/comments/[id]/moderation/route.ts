import { corpoDe, encaminhar } from "@/lib/api/proxy";

/** Ocultar ou devolver ao ar. A API confere se quem pede é da curadoria. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await corpoDe(request);

  if (!body) {
    return Response.json({ message: "Requisição inválida." }, { status: 400 });
  }

  return encaminhar(`/comments/${id}/moderation`, {
    method: "PATCH",
    body,
    erroPadrao: "Não foi possível moderar o comentário.",
  });
}
