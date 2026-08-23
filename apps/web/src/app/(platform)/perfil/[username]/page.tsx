import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/Avatar";
import { PostCard } from "@/components/blog/PostCard";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { getCurrentUser } from "@/lib/api/catalog";
import { getProfile } from "@/lib/api/community";
import { formatarDataLonga } from "@/lib/datas";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const perfil = await getProfile(username);

  if (!perfil) return { title: "Perfil não encontrado" };

  return {
    title: perfil.name,
    description: perfil.bio ?? `Perfil de ${perfil.name} no Orbital.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const [perfil, viewer] = await Promise.all([getProfile(username), getCurrentUser()]);

  if (!perfil) notFound();

  const ehOProprio = viewer?.username === perfil.username;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-start gap-5">
        <Avatar name={perfil.name} username={perfil.username} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{perfil.name}</h1>
            {perfil.isCurator ? <Badge tone="accent">Curadoria</Badge> : null}
          </div>

          <p className="mt-0.5 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink-faint)]">
            @{perfil.username}
          </p>

          {perfil.bio ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {perfil.bio}
            </p>
          ) : null}

          <p className="tabular mt-3 text-xs text-[var(--color-ink-faint)]">
            No Orbital desde {formatarDataLonga(perfil.joinedAt)}
            {typeof perfil.commentsCount === "number"
              ? ` · ${perfil.commentsCount} comentário${perfil.commentsCount === 1 ? "" : "s"}`
              : null}
          </p>
        </div>

        {ehOProprio ? (
          <Link
            href="/conta"
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3.5 py-2 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Editar perfil
          </Link>
        ) : null}
      </header>

      {perfil.authoredPosts && perfil.authoredPosts.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
            Publicou no blog
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {perfil.authoredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-sm tracking-wide text-[var(--color-ink-faint)] uppercase">
          Comentários recentes
        </h2>

        {perfil.comments && perfil.comments.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3">
            {perfil.comments.map((comment) => (
              <Panel key={comment.id} className="p-4">
                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--color-ink-muted)]">
                  {comment.body}
                </p>
                <p className="tabular mt-3 text-[11px] text-[var(--color-ink-faint)]">
                  {comment.likesCount ?? 0} curtida
                  {(comment.likesCount ?? 0) === 1 ? "" : "s"}
                </p>
              </Panel>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--color-ink-faint)]">
            Nenhum comentário público ainda.
          </p>
        )}
      </section>

      {/* O que a pessoa curtiu não aparece aqui, nem para ela mesma nesta
          página: curtida é histórico de leitura, e a página é pública. */}
    </div>
  );
}
