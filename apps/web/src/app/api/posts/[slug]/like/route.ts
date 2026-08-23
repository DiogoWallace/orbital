import { encaminhar } from "@/lib/api/proxy";

/** Alterna a curtida no post. */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return encaminhar(`/posts/${slug}/like`, {
    method: "POST",
    erroPadrao: "Não foi possível curtir agora.",
  });
}
