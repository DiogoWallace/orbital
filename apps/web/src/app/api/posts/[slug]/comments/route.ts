import { corpoDe, encaminhar } from "@/lib/api/proxy";

/** Publica um comentário ou uma resposta. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await corpoDe(request);

  if (!body) {
    return Response.json({ message: "Requisição inválida." }, { status: 400 });
  }

  return encaminhar(`/posts/${slug}/comments`, {
    method: "POST",
    body,
    erroPadrao: "Não foi possível publicar o comentário.",
  });
}
