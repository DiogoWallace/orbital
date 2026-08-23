import "server-only";

import { apiFetch, ApiError } from "./client";
import type { Envelope, Paginated, Post, PostSummary } from "./types";

/**
 * Leituras do blog.
 *
 * `authenticated` fica ligado (o padrão do cliente): a rota é pública, mas o
 * token vai junto quando existe, porque é o que permite a um curador abrir o
 * próprio rascunho pela mesma URL. A API decide o que devolver — ver
 * ResolveOptionalUser, do lado do Laravel.
 */

/** Um minuto: o blog muda em ritmo editorial, não a cada requisição. */
const BLOG_REVALIDATE = 60;

export interface PostFilters {
  tag?: string;
  search?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

function buildQuery(filters: PostFilters): string {
  const params = new URLSearchParams();
  const { sort, page, perPage, ...rest } = filters;

  for (const [key, value] of Object.entries(rest)) {
    if (value) params.set(`filter[${key}]`, String(value));
  }

  if (sort) params.set("sort", sort);
  if (page) params.set("page", String(page));
  if (perPage) params.set("perPage", String(perPage));

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function getPosts(filters: PostFilters = {}): Promise<Paginated<PostSummary>> {
  return apiFetch<Paginated<PostSummary>>(`/posts${buildQuery(filters)}`, {
    revalidate: BLOG_REVALIDATE,
    tags: ["posts"],
  });
}

/** Devolve `null` em vez de lançar quando o post não existe ou é rascunho alheio. */
export async function getPost(slug: string): Promise<Post | null> {
  try {
    const { data } = await apiFetch<Envelope<Post>>(`/posts/${slug}`, {
      revalidate: BLOG_REVALIDATE,
      tags: ["posts", `post:${slug}`],
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
