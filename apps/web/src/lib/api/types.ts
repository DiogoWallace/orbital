/**
 * Contrato da API v1.
 *
 * Escrito à mão nesta fase e substituído por geração automática a partir do
 * OpenAPI (`packages/contracts`) assim que a API estabilizar — ver ADR 0001.
 * Enquanto for manual, este arquivo é a única fonte de verdade do frontend:
 * nenhum componente deve inventar um shape próprio.
 */

export type ModuleKind =
  | "simulation"
  | "dataset_explorer"
  | "visualization"
  | "article"
  | "experiment";

export type ModuleStatus = "draft" | "review" | "published" | "archived";

export type DifficultyLevel = "introductory" | "intermediate" | "advanced";

export interface DisciplineBadge {
  slug: string;
  name: string;
  accent: string;
  icon: string | null;
}

export interface Topic {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  children?: Topic[];
  modulesCount?: number;
}

export interface Discipline extends DisciplineBadge {
  id: number;
  tagline: string | null;
  description: string | null;
  position: number;
  topics?: Topic[];
  modulesCount?: number;
}

export interface Tag {
  slug: string;
  name: string;
}

export interface ModuleSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  kind: ModuleKind;
  kindLabel: string;
  status: ModuleStatus;
  difficulty: DifficultyLevel;
  difficultyLabel: string;
  componentKey: string | null;
  estimatedMinutes: number | null;
  coverPath: string | null;
  publishedAt: string | null;
  discipline?: DisciplineBadge;
  topic?: Topic;
  tags?: Tag[];
}

export type SectionKind = "text" | "formula" | "figure" | "callout" | "reference";

export interface ModuleSection {
  id: number;
  kind: SectionKind;
  anchor: string | null;
  title: string | null;
  body: string | null;
  meta: Record<string, unknown>;
  position: number;
}

export interface ScienceModule extends ModuleSummary {
  /**
   * Configuração livre do módulo. O núcleo entende apenas as chaves do
   * ModuleSpec (parâmetros, presets, saídas); o restante pertence ao
   * componente — ver ADR 0006.
   */
  spec: Record<string, unknown>;
  sections?: ModuleSection[];
  author?: { id: number; name: string };
  projects?: ProjectSummary[];
  updatedAt: string | null;
}

export interface ProjectSummary {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  kind: string;
  kindLabel: string;
  status: string;
  statusLabel: string;
  coverPath: string | null;
  startedAt: string | null;
  publishedAt: string | null;
  modulesCount?: number;
}

export interface Project extends ProjectSummary {
  description: string | null;
  owner?: { id: number; name: string };
  modules?: ModuleSummary[];
}

export interface User {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  avatarPath: string | null;
  email: string;
  roles: string[];
  isCurator: boolean;
  /** Falso libera a navegação, mas bloqueia o que grava (porta suave). */
  emailVerified: boolean;
  createdAt: string | null;
}

export interface SimulationRun {
  id: string;
  label: string | null;
  parameters: Record<string, number | string | boolean>;
  result: Record<string, unknown> | null;
  modelVersion: string;
  isPublic: boolean;
  createdAt: string | null;
  module?: ModuleSummary;
}

/** Um texto do blog, no recorte da listagem. */
export interface PostSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  /** Calculado na API a partir do corpo — não é coluna no banco. */
  readingMinutes: number;
  coverPath: string | null;
  /** Obrigatório sempre que houver capa: a licença da imagem exige. */
  coverCredit: string | null;
  coverSource: string | null;
  author?: { id: number; name: string };
  tags?: Tag[];
  likesCount?: number;
  commentsCount?: number;
  /** Se *este* leitor curtiu. Sempre falso para quem não está logado. */
  liked?: boolean;
}

/** O post completo, com o corpo em Markdown. */
export interface Post extends PostSummary {
  body: string;
  updatedAt: string | null;
}

/** Identidade pública de alguém. Nunca traz e-mail. */
export interface PublicProfile {
  username: string;
  name: string;
  bio: string | null;
  avatarPath: string | null;
  isCurator: boolean;
  joinedAt: string | null;
  commentsCount?: number;
  comments?: CommentNode[];
  authoredPosts?: PostSummary[];
}

/**
 * Um comentário do fio.
 *
 * `replies` só vem preenchido nos comentários raiz: a conversa tem uma camada
 * só, e uma resposta nunca tem respostas próprias.
 */
export interface CommentNode {
  id: number;
  parentId: number | null;
  body: string;
  status: "visible" | "hidden";
  createdAt: string | null;
  editedAt: string | null;
  author?: PublicProfile;
  likesCount?: number;
  liked?: boolean;
  /** O que *este* leitor pode fazer, decidido pela policy da API. */
  viewerCan: {
    edit: boolean;
    delete: boolean;
    report: boolean;
    moderate: boolean;
  };
  replies?: CommentNode[];
}

/**
 * De onde uma série veio, e quando.
 *
 * Não é metadado decorativo: é o elo "dataset → versão do dado" da cadeia de
 * reprodutibilidade (ADR 0014). A interface renderiza isto junto do gráfico
 * pela mesma razão que renderiza o crédito junto da imagem do Webb — dado sem
 * procedência ao lado é uma dívida esperando vencer.
 */
export interface DatasetProvenance {
  mission: string;
  missionLabel: string;
  missionFullName: string;
  instrument: string;
  pipeline: string | null;
  product: string | null;
  /** Máscara de qualidade aplicada — muda quais cadências entraram. */
  qualityMask: string | null;
  archive: string;
  file: string | null;
  sha256: string | null;
  retrievedAt: string | null;
  citation: string | null;
}

/** Uma série observacional, sem os pontos. */
export interface Dataset {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  target: string;
  externalId: string | null;
  sector: number | null;
  cadenceSeconds: number | null;
  points: number;
  timeSpanDays: number | null;
  provenance: DatasetProvenance;
  /** Falso enquanto faltar soma de verificação ou citação. */
  citable: boolean;
  publishedAt: string | null;
}

/** Os pontos, em vetores paralelos — a forma que o cliente consome direto. */
export interface DatasetSeries {
  slug: string;
  points: number;
  time: number[];
  flux: number[];
}

/** Envelope de coleção paginada devolvido pela API. */
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
}

export interface Envelope<T> {
  data: T;
}

/** Erro em RFC 7807, como a API o devolve. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Record<string, string[]>;
}
