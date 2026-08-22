import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import type { ProblemDetails } from "./types";

/**
 * Cliente HTTP do BFF (ADR 0004).
 *
 * Marcado como `server-only`: se algum componente cliente tentar importá-lo, o
 * build falha. Essa é a garantia mecânica de que o token nunca chega ao bundle
 * do navegador — uma convenção documentada não daria a mesma segurança.
 */

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8100";

export const SESSION_COOKIE = "orbital_session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null,
  ) {
    super(problem?.detail ?? `A API respondeu ${status}.`);
    this.name = "ApiError";
  }

  /** Erros de validação por campo, prontos para exibir no formulário. */
  get fieldErrors(): Record<string, string[]> {
    return this.problem?.errors ?? {};
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Anexa o token da sessão. Padrão: true. */
  authenticated?: boolean;
  /** Revalidação do cache do Next, em segundos. */
  revalidate?: number | false;
  tags?: string[];
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Declara que este render depende da requisição, o que tira a página da
  // pré-renderização em tempo de build.
  //
  // Sem isto, `next build` tentaria montar as páginas do catálogo durante a
  // construção da imagem Docker — quando a API ainda não existe — e o build
  // quebraria. O cache de dados continua valendo: o `revalidate` abaixo é do
  // fetch, independente do modo de render, então a página segue servindo
  // dados quentes sem ir ao banco a cada visita.
  await connection();

  const { body, authenticated = true, revalidate, tags, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    next: revalidate === undefined ? { tags } : { revalidate, tags },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, payload as ProblemDetails | null);
  }

  return payload as T;
}
