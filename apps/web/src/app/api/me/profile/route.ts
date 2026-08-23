import { corpoDe, encaminhar } from "@/lib/api/proxy";

export async function PATCH(request: Request) {
  const body = await corpoDe(request);

  if (!body) {
    return Response.json({ message: "Requisição inválida." }, { status: 400 });
  }

  return encaminhar("/me/profile", {
    method: "PATCH",
    body,
    erroPadrao: "Não foi possível salvar o perfil.",
  });
}
