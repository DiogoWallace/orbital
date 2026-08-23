import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { getCurrentUser } from "@/lib/api/catalog";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Sua conta" };

export default async function AccountPage() {
  const user = await getCurrentUser();

  // Guarda no servidor: sem sessão, a página nem é montada. Esconder o
  // conteúdo no cliente deixaria os dados irem pelo fio antes de sumirem.
  if (!user) redirect("/login?proximo=/conta");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Sua conta</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
        O que está aqui aparece no seu perfil público em{" "}
        <Link
          href={`/perfil/${user.username}`}
          className="text-[var(--accent)] hover:underline"
        >
          /perfil/{user.username}
        </Link>
        .
      </p>

      <Panel className="mt-8 p-6">
        <ProfileForm user={user} />
      </Panel>

      <p className="mt-6 text-xs leading-relaxed text-[var(--color-ink-faint)]">
        Seu e-mail nunca aparece no perfil público, nem para outras contas.
      </p>
    </div>
  );
}
