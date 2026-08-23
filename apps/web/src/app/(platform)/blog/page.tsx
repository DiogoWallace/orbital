import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getPosts } from "@/lib/api/blog";

export const metadata = {
  title: "Blog",
  description:
    "Notas sobre a construção do Orbital, decisões de arquitetura e explicações curtas de física e astronomia.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; tag?: string }>;
}) {
  const { pagina, tag } = await searchParams;
  const page = Number(pagina) > 0 ? Number(pagina) : 1;

  const posts = await getPosts({ page, tag, perPage: 9 });

  const { current_page: atual, last_page: ultima } = posts.meta;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-muted)]">
          Notas sobre a construção da plataforma, decisões que valeram discussão e
          explicações curtas do que os módulos simulam.
        </p>
      </header>

      {tag ? (
        <p className="mt-6 text-xs text-[var(--color-ink-faint)]">
          Filtrando por <span className="text-[var(--color-ink)]">{tag}</span> ·{" "}
          <Link href="/blog" className="text-[var(--accent)] hover:underline">
            limpar
          </Link>
        </p>
      ) : null}

      {posts.data.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--color-ink-faint)]">
          Nada publicado por aqui ainda.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.data.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Paginação por link, e não por botão com JavaScript: cada página do
          blog precisa ter URL própria para ser indexada e compartilhada. */}
      {ultima > 1 ? (
        <nav
          aria-label="Paginação"
          className="tabular mt-12 flex items-center justify-between text-sm"
        >
          {atual > 1 ? (
            <Link
              href={`/blog?pagina=${atual - 1}`}
              className="text-[var(--color-ink-muted)] hover:text-[var(--accent)]"
            >
              ← Mais recentes
            </Link>
          ) : (
            <span />
          )}

          <span className="text-xs text-[var(--color-ink-faint)]">
            {atual} de {ultima}
          </span>

          {atual < ultima ? (
            <Link
              href={`/blog?pagina=${atual + 1}`}
              className="text-[var(--color-ink-muted)] hover:text-[var(--accent)]"
            >
              Mais antigos →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
