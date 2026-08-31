import { NextResponse } from "next/server";
import { corpoDe, encaminhar } from "@/lib/api/proxy";

/**
 * Guarda uma execução de simulação.
 *
 * A simulação roda no cliente (ADR 0007), então é o cliente que tem os
 * parâmetros e o resultado na mão. O servidor não recalcula nada: o que torna
 * a execução citável é `parameters` + `model_version`, e o resultado guardado
 * é conveniência de leitura.
 *
 * A rota exige e-mail confirmado do outro lado (ADR 0010) — simular é livre,
 * gravar com o seu nome junto não é. O 403 chega aqui como qualquer outro erro
 * e a interface explica.
 */
export async function POST(request: Request) {
  const body = await corpoDe(request);

  if (!body) {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  return encaminhar("/simulation-runs", {
    method: "POST",
    body,
    erroPadrao: "Não foi possível guardar a execução agora.",
  });
}
