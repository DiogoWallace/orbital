import "server-only";

import { apiFetch, ApiError } from "./client";
import type { CommentNode, Envelope, Paginated, PublicProfile } from "./types";

/**
 * Leituras da comunidade.
 *
 * Sem cache: comentário novo precisa aparecer no recarregar seguinte, e um
 * minuto de revalidação — que serve bem ao catálogo — aqui pareceria bug.
 */

export function getComments(slug: string): Promise<Paginated<CommentNode>> {
  return apiFetch<Paginated<CommentNode>>(`/posts/${slug}/comments`, {
    cache: "no-store",
  });
}

/** Devolve `null` quando o username não existe. */
export async function getProfile(username: string): Promise<PublicProfile | null> {
  try {
    const { data } = await apiFetch<Envelope<PublicProfile>>(`/profiles/${username}`, {
      cache: "no-store",
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
