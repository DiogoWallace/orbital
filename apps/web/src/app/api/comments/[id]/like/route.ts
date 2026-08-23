import { encaminhar } from "@/lib/api/proxy";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return encaminhar(`/comments/${id}/like`, {
    method: "POST",
    erroPadrao: "Não foi possível curtir agora.",
  });
}
