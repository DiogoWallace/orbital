import "server-only";

import { apiFetch, ApiError } from "./client";
import type {
  Discipline,
  Envelope,
  ModuleSummary,
  Paginated,
  Project,
  ProjectSummary,
  ScienceModule,
  User,
} from "./types";

/**
 * Leituras do catálogo.
 *
 * Cada função declara sua própria política de cache. Conteúdo público é
 * revalidado por tempo — o catálogo muda em ritmo editorial, não a cada
 * requisição, e servir uma página pronta é a diferença entre uma landing
 * instantânea e uma que espera o banco.
 */

const CATALOG_REVALIDATE = 60;

export interface ModuleFilters {
  discipline?: string;
  topic?: string;
  tag?: string;
  kind?: string;
  difficulty?: string;
  search?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

function buildQuery(filters: ModuleFilters): string {
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

export function getDisciplines(): Promise<Envelope<Discipline[]>> {
  return apiFetch<Envelope<Discipline[]>>("/disciplines", {
    authenticated: false,
    revalidate: CATALOG_REVALIDATE,
    tags: ["disciplines"],
  });
}

export function getDiscipline(slug: string): Promise<Envelope<Discipline>> {
  return apiFetch<Envelope<Discipline>>(`/disciplines/${slug}`, {
    authenticated: false,
    revalidate: CATALOG_REVALIDATE,
    tags: ["disciplines", `discipline:${slug}`],
  });
}

export function getModules(filters: ModuleFilters = {}): Promise<Paginated<ModuleSummary>> {
  return apiFetch<Paginated<ModuleSummary>>(`/modules${buildQuery(filters)}`, {
    revalidate: CATALOG_REVALIDATE,
    tags: ["modules"],
  });
}

/** Devolve `null` em vez de lançar quando o módulo não existe ou não está publicado. */
export async function getModule(slug: string): Promise<ScienceModule | null> {
  try {
    const { data } = await apiFetch<Envelope<ScienceModule>>(`/modules/${slug}`, {
      revalidate: CATALOG_REVALIDATE,
      tags: ["modules", `module:${slug}`],
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export function getProjects(): Promise<Paginated<ProjectSummary>> {
  return apiFetch<Paginated<ProjectSummary>>("/projects", {
    authenticated: false,
    revalidate: CATALOG_REVALIDATE,
    tags: ["projects"],
  });
}

export async function getProject(slug: string): Promise<Project | null> {
  try {
    const { data } = await apiFetch<Envelope<Project>>(`/projects/${slug}`, {
      revalidate: CATALOG_REVALIDATE,
      tags: ["projects", `project:${slug}`],
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

/** Usuário da sessão atual, ou `null` se não houver sessão válida. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Sem cache: sessão é por requisição.
    const { data } = await apiFetch<Envelope<User>>("/me", { cache: "no-store" });

    return data;
  } catch {
    return null;
  }
}
